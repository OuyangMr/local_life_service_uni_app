import { request } from './request'

// 登录
export function login(data: { username: string; password: string }) {
  return request.post('/admin/auth/login', data)
}

// 退出登录
export function logout() {
  return request.post('/admin/auth/logout')
}

// 获取用户信息
export function getUserInfo() {
  return request.get('/admin/auth/info')
}

// 修改密码
export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.put('/admin/auth/password', data)
}