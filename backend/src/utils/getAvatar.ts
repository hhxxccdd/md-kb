/**
 * 获取随机头像（同步，直接调用，直接返回图片URL）
 */
export function getRandomAvatar() {
  // 加时间戳 = 强制每次都换新头像，不缓存
  return `https://api.xyttkx.cn/avatar.php?t=${Date.now()}`
}