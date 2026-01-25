/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Elysia } from 'elysia'

export const app = new Elysia({ prefix: '/api' }) 
	.get('/', 'Hello Nextjs')

export const GET = app.fetch
export const POST = app.fetch