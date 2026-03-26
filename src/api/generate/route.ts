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