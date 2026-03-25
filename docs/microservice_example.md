# Next.js 16 + Go Fiber — защищённый шлюз

## Структура проекта

```
/nextjs-app
  /app/api/generate/route.ts   ← шлюз
  /lib/hmac.ts                 ← утилита генерации токена
  .env.local

/go-service
  main.go
  middleware/auth.go
  .env
```

---

## .env.local (Next.js)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret_from_docker_env   # из .env self-hosted
HMAC_SECRET=super_secret_min_32_chars_here!!
GO_SERVICE_URL=https://go.yourdomain.com
```

---

## /lib/hmac.ts

```typescript
import crypto from 'crypto'

export function generateHMACToken(userId: string, action: string): string {
  const payload = JSON.stringify({
    user_id: userId,
    action,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 минут
    iat: Math.floor(Date.now() / 1000),
  })

  const payloadB64 = Buffer.from(payload).toString('base64url')

  const sig = crypto
    .createHmac('sha256', process.env.HMAC_SECRET!)
    .update(payloadB64)
    .digest('hex')

  return `${payloadB64}.${sig}`
}
```

---

## /app/api/generate/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { generateHMACToken } from '@/lib/hmac'

// Тип payload Supabase JWT
interface SupabaseJWTPayload {
  sub: string        // user_id
  role: string       // 'authenticated'
  email?: string
  exp: number
  iat: number
}

export async function POST(req: NextRequest) {
  // 1. Берём Authorization header от клиента
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')

  // 2. Верифицируем Supabase JWT локально — без сетевого запроса
  //    jsonwebtoken сам проверяет подпись + expiry
  let payload: SupabaseJWTPayload
  try {
    payload = jwt.verify(
      token,
      process.env.SUPABASE_JWT_SECRET!
    ) as SupabaseJWTPayload
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // 3. Дополнительная проверка роли (не анонимный пользователь)
  if (payload.role !== 'authenticated') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = payload.sub

  // 3. Берём тело запроса от клиента
  const body = await req.json()

  // 4. Генерируем короткоживущий HMAC-токен для Go
  //    Go видит только этот токен — никакого Supabase JWT
  const hmacToken = generateHMACToken(userId, 'generate')

  // 5. Проксируем запрос в Go микросервис
  const goRes = await fetch(`${process.env.GO_SERVICE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': hmacToken,
    },
    body: JSON.stringify({
      user_id: userId,
      data: body.data,
    }),
  })

  if (!goRes.ok) {
    const err = await goRes.json()
    return NextResponse.json({ error: err }, { status: goRes.status })
  }

  const result = await goRes.json()

  // 6. Возвращаем ответ клиенту
  return NextResponse.json(result)
}
```

---

## Клиентский вызов (React компонент)

```typescript
'use client'
import { createClient } from '@/utils/supabase/client'

async function callGenerate(data: object) {
  const supabase = createClient()

  // Берём актуальный JWT пользователя
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not logged in')

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ data }),
  })

  return res.json()
}
```

---

## Go микросервис

### go.mod

```
module go-service

go 1.22

require (
    github.com/gofiber/fiber/v2 v2.52.4
    github.com/joho/godotenv v1.5.1
)
```

### middleware/auth.go

```go
package middleware

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "encoding/hex"
    "encoding/json"
    "os"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
)

type TokenPayload struct {
    UserID string `json:"user_id"`
    Action string `json:"action"`
    Exp    int64  `json:"exp"`
    Iat    int64  `json:"iat"`
}

// AuthMiddleware — проверяет X-Auth-Token, кладёт user_id в Locals
func AuthMiddleware() fiber.Handler {
    secret := []byte(os.Getenv("HMAC_SECRET"))

    return func(c *fiber.Ctx) error {
        token := c.Get("X-Auth-Token")
        if token == "" {
            return c.Status(401).JSON(fiber.Map{"error": "missing token"})
        }

        // Формат токена: base64url(payload).hmac_hex
        parts := strings.SplitN(token, ".", 2)
        if len(parts) != 2 {
            return c.Status(401).JSON(fiber.Map{"error": "bad token format"})
        }

        payloadB64, sigFromToken := parts[0], parts[1]

        // Проверяем подпись
        h := hmac.New(sha256.New, secret)
        h.Write([]byte(payloadB64))
        expectedSig := hex.EncodeToString(h.Sum(nil))

        // Constant time compare — защита от timing attack
        if !hmac.Equal([]byte(expectedSig), []byte(sigFromToken)) {
            return c.Status(401).JSON(fiber.Map{"error": "invalid signature"})
        }

        // Декодируем payload
        payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadB64)
        if err != nil {
            return c.Status(401).JSON(fiber.Map{"error": "bad payload"})
        }

        var payload TokenPayload
        if err := json.Unmarshal(payloadBytes, &payload); err != nil {
            return c.Status(401).JSON(fiber.Map{"error": "bad payload json"})
        }

        // Проверяем expiry
        if payload.Exp < time.Now().Unix() {
            return c.Status(401).JSON(fiber.Map{"error": "token expired"})
        }

        // Кладём user_id в контекст — дальше используем в хэндлерах
        c.Locals("user_id", payload.UserID)
        c.Locals("action", payload.Action)

        return c.Next()
    }
}
```

### main.go

```go
package main

import (
    "go-service/middleware"
    "log"
    "os"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/joho/godotenv"
)

type GenerateRequest struct {
    UserID string         `json:"user_id"`
    Data   map[string]any `json:"data"`
}

func main() {
    // Загружаем .env
    if err := godotenv.Load(); err != nil {
        log.Println("no .env file, using system env")
    }

    app := fiber.New(fiber.Config{
        // Скрываем детали ошибок от клиента
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            return c.Status(500).JSON(fiber.Map{"error": "internal error"})
        },
    })

    // Базовые middleware
    app.Use(logger.New())
    app.Use(recover.New())

    // Все защищённые роуты — под AuthMiddleware
    api := app.Group("/", middleware.AuthMiddleware())

    api.Post("/generate", handleGenerate)

    port := os.Getenv("PORT")
    if port == "" {
        port = "3001"
    }

    log.Fatal(app.Listen(":" + port))
}

func handleGenerate(c *fiber.Ctx) error {
    // user_id уже проверен middleware, просто берём
    userID := c.Locals("user_id").(string)

    var req GenerateRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "bad request"})
    }

    // Убеждаемся что user_id из токена == user_id из тела
    // (защита от подмены)
    if req.UserID != userID {
        return c.Status(403).JSON(fiber.Map{"error": "user mismatch"})
    }

    // --- Твоя бизнес-логика здесь ---
    result := doHeavyWork(userID, req.Data)
    // --------------------------------

    return c.JSON(fiber.Map{
        "status":  "ok",
        "user_id": userID,
        "result":  result,
    })
}

func doHeavyWork(userID string, data map[string]any) map[string]any {
    // Здесь тяжёлая операция — генерация документа, обработка и т.д.
    return map[string]any{
        "generated_for": userID,
        "input":         data,
        "output":        "your heavy result here",
    }
}
```

### .env (Go)

```env
HMAC_SECRET=super_secret_min_32_chars_here!!
PORT=3001
```

---

## Схема потока

```
Browser
  │
  │  POST /api/generate  (Bearer: Supabase JWT)
  ▼
Next.js API Route
  ├─ supabase.auth.getUser(jwt) → user.id  ✅
  ├─ generateHMACToken(user.id)            ✅
  │
  │  POST https://go.domain.com/generate
  │  X-Auth-Token: <hmac_token>
  ▼
Go Fiber
  ├─ AuthMiddleware: проверка подписи      ✅
  ├─ Проверка expiry                       ✅
  ├─ user_id → Locals                      ✅
  ├─ user_id mismatch check                ✅
  └─ doHeavyWork(userID, data)             ✅
```