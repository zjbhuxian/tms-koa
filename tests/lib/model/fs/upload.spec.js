const { Upload, UploadImage } = require('../../../../lib/model/fs/upload')

describe('#model-upload-image', function() {
    it('给上传文件生成文件名', () => {
        let upload = new Upload()
        expect(upload.storename('jpg')).toMatch(/\d{6}\/\d{4}\/\d{8}\.jpg/)
    })
    it('storeBase64', () => {
        let myfs = {
            write: jest.fn().mockReturnValue('store-fullpath')
        }
        let upload = new UploadImage(myfs)
        upload.storename = jest.fn().mockReturnValue('store-name')

        let fullpath = upload.storeBase64('data:image/jpeg;base64,fake')

        expect(upload.storename).toHaveBeenCalled()
        expect(upload.storename.mock.calls[0][0]).toBe('jpg')
        expect(myfs.write).toHaveBeenCalled()
        expect(myfs.write.mock.calls[0][0]).toBe('store-name')
        expect(myfs.write.mock.calls[0][1]).toBeInstanceOf(Buffer)
        expect(myfs.write.mock.calls[0][1].toString('base64')).toBe('fake')
        expect(fullpath).toMatch('store-fullpath')
    })
    it('storeBase64存储实际图片-jpeg', () => {
        const fs = require('fs')
        const { LocalFS } = require('../../../../lib/model/fs/local')
        let lfs = new LocalFS('tests', { fileConfig: { local: { rootDir: 'files' } } })
        let upload = new UploadImage(lfs)
        let filepath = upload.storeBase64(fs.readFileSync(`${__dirname}/image.jpeg.base64`).toString())
        expect(filepath).toMatch(/files\/tests\/\d{6}\/\d{4}\/\d{8}\.jpg/)
    })
    it('storeBase64存储实际图片-png', () => {
        const fs = require('fs')
        const { LocalFS } = require('../../../../lib/model/fs/local')
        let lfs = new LocalFS('tests', { fileConfig: { local: { rootDir: 'files' } } })
        let upload = new UploadImage(lfs)
        let filepath = upload.storeBase64(fs.readFileSync(`${__dirname}/image.png.base64`).toString())
        expect(filepath).toMatch(/files\/tests\/\d{6}\/\d{4}\/\d{8}\.png/)
    })
})