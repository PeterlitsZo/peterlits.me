export const env = {
  AUTH_JWT_SECRET: 'test-auth-secret',
  peterlits_me: {
    prepare() {
      throw new Error('Test stub for cloudflare:workers env was used unexpectedly.')
    },
  },
}
