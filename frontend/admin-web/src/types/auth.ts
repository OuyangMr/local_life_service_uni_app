export interface LoginData {
  username: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  role: string
  roles: string[]
  permissions: string[]
}