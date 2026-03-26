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