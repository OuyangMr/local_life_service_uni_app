/**
 * 商品服务
 * @description 实现商品目录查询、搜索、加购功能
 */

import apiService, { buildQueryParams } from './api'
import type {
  ProductListRequest, ProductDetailResponse, CreateProductRequest,
  UpdateProductRequest
} from '@/types/api'
import type { Product, PaginationInfo } from '@/types'
import { API_ENDPOINTS } from '@/constants'

class ProductService {
  /**
   * 获取商品列表
   */
  async getProductList(params: ProductListRequest): Promise<{
    products: Product[]
    pagination: PaginationInfo
  }> {
    const queryString = buildQueryParams(params)
    const response = await apiService.get<{
      products: Product[]
      pagination: PaginationInfo
    }>(`${API_ENDPOINTS.PRODUCTS.LIST(params.storeId)}${queryString}`)
    return response.data
  }

  /**
   * 获取商品详情
   */
  async getProductDetail(productId: string): Promise<ProductDetailResponse> {
    const response = await apiService.get<ProductDetailResponse>(
      API_ENDPOINTS.PRODUCTS.DETAIL(productId),
      { showLoading: true }
    )
    return response.data
  }

  /**
   * 获取商品分类
   */
  async getProductCategories(storeId: string): Promise<string[]> {
    const response = await apiService.get<string[]>(
      API_ENDPOINTS.PRODUCTS.CATEGORIES(storeId)
    )
    return response.data
  }

  /**
   * 创建商品（商户端使用）
   */
  async createProduct(params: CreateProductRequest): Promise<Product> {
    const response = await apiService.post<Product>(
      API_ENDPOINTS.PRODUCTS.CREATE,
      params,
      { showLoading: true, loadingText: '创建中...' }
    )
    return response.data
  }

  /**
   * 更新商品（商户端使用）
   */
  async updateProduct(productId: string, params: UpdateProductRequest): Promise<Product> {
    const response = await apiService.put<Product>(
      API_ENDPOINTS.PRODUCTS.UPDATE(productId),
      params,
      { showLoading: true, loadingText: '更新中...' }
    )
    return response.data
  }

  /**
   * 删除商品（商户端使用）
   */
  async deleteProduct(productId: string): Promise<void> {
    await apiService.delete(
      API_ENDPOINTS.PRODUCTS.DELETE(productId),
      { showLoading: true, loadingText: '删除中...' }
    )
  }
}

export const productService = new ProductService()
export default productService
