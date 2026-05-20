import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { JWT_CONFIG } from './config'
import { throwAuthError} from '../../utils/throwError'
import { AccessTokenPayload } from './type'
import { ApiCode } from '../../utils/types/response'


export const verifyAccessToken = async (accessToken: string) => {
    try {
        const payload = jwt.verify(accessToken, JWT_CONFIG.secret) as AccessTokenPayload

        if (payload.type !== 'access') {
            throwAuthError('无效的 Access Token', 401, ApiCode.AccessTokenInvalid)
        }
        return payload.userId
    } catch (e) {
        if (e instanceof TokenExpiredError) {
            throwAuthError('Access Token 已过期', 401, ApiCode.AccessTokenExpired)
            
        }
        if (e instanceof JsonWebTokenError) {
            throwAuthError('无效的 Access Token', 401, ApiCode.AccessTokenInvalid)
        }
        throw e
    }
}