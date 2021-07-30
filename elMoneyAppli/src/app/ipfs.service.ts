import { Injectable } from '@angular/core';
import {$$, showError, showMessage} from "./tools";
import {HttpClient, HttpEventType, HttpHeaders} from "@angular/common/http";
import {ApiService} from "./api.service";

@Injectable({
  providedIn: 'root'
})
export class IpfsService {

  //domain:string;
  client:any;

  constructor(
    public api: ApiService
  ) {
    //this.client=create({url:'http://161.97.75.165:5001/api/v0'});
    //this.domain="http://161.97.75.165:5001";
  }

  add(content: any,vm=null,func=null) {
    if(!content || content.length==0){
      func();
    } else {
      if(typeof(content)=="object"){
        this.api._post_file("upload_file",content,true)
          .subscribe((event:any)=>{
            if (event.type == HttpEventType.UploadProgress){
              vm.uploadProgress = Math.round(100 * (event.loaded / event.total));
            }
            if (event.type === HttpEventType.Response) {
              showMessage(vm,"Upload");
              vm.uploadProgress=null;
              if(func)func(event.cid);
            }
        });
      } else {
        if(content.startsWith('http')){
          func(content)
        } else {
          this.api._post("upload_file/","",content,60,{
            "Content-Type":"multipart/form-data",
            "Accept": "application/json"
          }).subscribe((result:any)=>{
              $$("Enregistrement de https://ipfs.io/ipfs/"+result.cid);
              showMessage(vm,"Upload");
              if(func)func(result.cid);
          },(err)=>{showError(vm,err);});
        }
      }
    }
  }

  // direct_add(file:File){
  //   let url="http://161.97.75.165:5000/api/v0/add";
  //   let formData = new FormData();
  //   formData.append('data',file,file.name);
  //   this.api._post(url,"", {path:file.name,content:"coucouc"}).subscribe((r:any)=>{
  //     debugger;
  //   });
  // }



  // add_old(content:string,vm=null,func=null,_type="image/jpeg",withDomain=false){
  //   if(!content || content.length==0){
  //     func("");
  //   }else{
  //     let _blob=new Blob([content],{type:_type});
  //     if(typeof(content)=="string" && content.indexOf("base64,")>0){
  //         content=content.split("base64,")[1];
  //         _blob=new Blob([btoa(content)],{
  //           type:"application/octet-stream"
  //         });
  //     }
  //
  //     let pathFile=encodeURIComponent("/file_"+new Date().getTime()+".jpg");
  //
  //     let formData = new FormData();
  //     formData.append('data',_blob,pathFile);
  //
  //     this.http.post(this.domain+"/api/v0/add",formData).subscribe((r:any)=>{
  //       if(vm)showMessage(vm,"Fichier enregistré");
  //       $$("Fichier enregistré avec le hash ",r);
  //       if(withDomain)r.Hash="https://ipfs.io/ipfs/"+r.Hash;
  //       if(func)func(r.Hash);
  //     },(err)=>{
  //       if(vm)showError(vm,err);
  //       if(func)func("");
  //     })
  //   }
  // }


}
