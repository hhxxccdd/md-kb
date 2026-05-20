import * as Y from 'yjs'
import {ref} from 'vue'
import { Awareness } from 'y-protocols/awareness.js'
import { yCollab } from 'y-codemirror.next'
import type { Extension } from '@codemirror/state'

type UseYjsMarddownOptions = {
    initialContent:string;
    onLocalUpdate?:(update:number[]) => void;
    onTextChange?:(content:string) => void
}

export const useYjsMarkdown = (options:UseYjsMarddownOptions) => {

     //创建Yjs文档
     const ydoc = new Y.Doc()
     //在Y.Doc创建一段文本
     const ytext = ydoc.getText("markdown")
     //Awareness用来存放在线状态
     const awareness = new Awareness(ydoc)
     //标记当前是否正在应用远端update
     const applyingRemote = ref(false)
     
     //用数据库的内容初始化y.Text   一开始初始化插入一次
     if(ytext.length === 0 && options.initialContent){
         ydoc.transact(() => {
            ytext.insert(0,options.initialContent)
         },'init')
     }


     //监听Y.Doc更新
     ydoc.on('update',(update,origin) => {
        //初始化内容产生的update，不需要发给别人
        if(origin === 'init') return 

        //远端update应用到本地，也不再发回服务器
        //否则会出现 A -> B -> A -> B的循环
        if(origin === 'remote')  return

        options.onLocalUpdate?.(Array.from(update))
     })


     //生成CodeMirror6的协同扩展
     const collabExtension: Extension = yCollab(ytext,awareness)


     //应用别人远端发来的update
     const applyRemoteUpdate = (update: number[]) => {

        applyingRemote.value = true

        Y.applyUpdate(ydoc,new Uint8Array(update),'remote')

        applyingRemote.value = false

     }

    const getContent= () => {
        return ytext.toString()
    }

    const destroy = () => {
        ydoc.destroy()
    }

   return {
     ydoc,
     ytext,
     awareness,
     collabExtension,
     applyingRemote,
     applyRemoteUpdate,
     getContent,
     destroy
   }






}
