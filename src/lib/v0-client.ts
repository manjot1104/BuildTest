'use server'

import { createClient } from 'v0-sdk'
import { env } from '@/env'

export async function getV0Client() {
    return createClient(
        { apiKey: env.V0_API_KEY as string },
      )
}