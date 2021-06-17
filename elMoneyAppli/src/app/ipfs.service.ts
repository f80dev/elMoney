import { Injectable } from '@angular/core';
import {$$, showError, showMessage} from "./tools";
import {HttpClient, HttpHeaders} from "@angular/common/http";
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

  add(content: string,vm=null,func=null,_type="image/jpeg",withDomain=false) {
    debugger
    if(!content || content.length==0){
      func();
    } else {
      this.api._post("upload_file","",content).subscribe((result:any)=>{
        $$("Enregistrement de https://ipfs.io/ipfs/"+result.cid);
        showMessage(vm,"Upload");
        if(func)func(result.cid);
      },(err)=>{
        showError(vm,err);
        debugger;
      })
    }
  }

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
