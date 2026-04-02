import express, { Router, Request, Response } from 'express'
import { throwBusinessError } from '../../middleware/errorMiddleware'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { success } from '../../utils/response'

const router: Router = express.Router()

//配置存储：按照日期文件夹+唯一命名
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dateDir = new Date().toISOString().split('T')[0]
        const uploadpath = path.join(__dirname, '../uploads', dateDir)

        if (!fs.existsSync(uploadpath)) {
            fs.mkdirSync(uploadpath, { recursive: true })
        }
        cb(null, uploadpath)
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
        cb(null, uniqueName)
    }
})

//图片格式校验
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowExts = /jpg|jpeg|png|gif|webp/
    const extName = allowExts.test(path.extname(file.originalname).toLocaleLowerCase())
    const mimeType = allowExts.test(file.mimetype)

    extName && mimeType ? cb(null, true) : cb(throwBusinessError('仅支持 JPG/PNG/GIF/WEBP 格式图片'))
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
})

//上传核心
router.post('/image', upload.single('image'), (req: Request, res: Response) => {

      if(!req.file)  throwBusinessError('上传图片不能为空')
    
      const dateDir = new Date().toISOString().split('T')[0]
      const imageUrl = `http://localhost:3000/uploads/${dateDir}/${req.file?.filename}` 
    
      success(res,{url:imageUrl})

})

export default router