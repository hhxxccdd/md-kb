const LEGACY_AVATAR_HOST = 'api.xyttkx.cn/avatar.php'

export function getUserAvatar(seed: string | number) {
  const avatarSeed = encodeURIComponent(String(seed))
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${avatarSeed}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9`
}

export function shouldRefreshAvatar(avatar?: string | null) {
  if (!avatar) return true
  return avatar.includes(LEGACY_AVATAR_HOST)
}
