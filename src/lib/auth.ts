import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import { z } from 'zod'
import type { NextAuthConfig } from 'next-auth'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
})

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password, mfaCode } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            mfaEnabled: true,
            mfaSecret: true,
            isActive: true,
          },
        })

        if (!user || !user.isActive || !user.passwordHash) {
          return null
        }

        const passwordValid = await verifyPassword(password, user.passwordHash)
        if (!passwordValid) {
          // Log failed attempt
          await prisma.ifAuditLog.create({
            data: {
              action: 'login_failed',
              metadata: { email },
            },
          }).catch(() => null)
          return null
        }

        // MFA check
        if (user.mfaEnabled) {
          if (!mfaCode) {
            // Signal MFA required via a special error
            throw new Error('MFA_REQUIRED')
          }

          const { decrypt } = await import('@/lib/auth-utils')
          const { TOTP } = await import('otpauth')

          const secret = decrypt(user.mfaSecret!)
          const totp = new TOTP({ secret })
          const delta = totp.validate({ token: mfaCode, window: 1 })

          if (delta === null) {
            return null
          }
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => null)

        // Log successful login
        await prisma.ifAuditLog.create({
          data: {
            userId: user.id,
            action: 'login',
            metadata: { email },
          },
        }).catch(() => null)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          mfaEnabled: user.mfaEnabled,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.mfaEnabled = user.mfaEnabled
        token.mfaVerified = user.mfaEnabled ? true : undefined

        // Load tenant memberships
        const memberships = await prisma.tenantUser.findMany({
          where: { userId: user.id, inviteStatus: 'accepted' },
          select: { tenantId: true, role: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        })

        if (memberships[0]) {
          token.activeTenantId = memberships[0].tenantId
          token.activeRole = memberships[0].role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.mfaEnabled = token.mfaEnabled as boolean
        session.activeTenantId = token.activeTenantId as string | undefined
        session.activeRole = token.activeRole as string | undefined
      }
      return session
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await prisma.ifAuditLog.create({
          data: {
            userId: token.id as string,
            action: 'logout',
            metadata: {},
          },
        }).catch(() => null)
      }
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
