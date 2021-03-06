import { Injectable } from '@angular/core';
import {$$, api, showError} from './tools';
import {timeout} from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  user: any;
  token: string = null;
  token_expires: Date;
  identifier: string=environment.default_contract;
  connectionStatus: boolean=true;


  constructor(public http: HttpClient) {
    this.token = localStorage.getItem('token');
  }


  getHttpOptions(){
    const httpOptions: any = {
      headers: new HttpHeaders({'Content-Type': 'application/json'})
    };
    if (!this.token) {this.token = localStorage.getItem('token'); }
    if (this.token) {httpOptions.headers.Authorization = 'Token ' + this.token; }
    return httpOptions;
  }



  _get(url, params: string= '', _timeoutInSec= 60){
    url = api(url, params);
    return this.http.get(url, this.getHttpOptions()).pipe(timeout(_timeoutInSec * 1000));
  }

  _post_file(url,file){
    let formData = new FormData();
    formData.append("file", file,file.name);
    url = api(url, "", true, '');
    //let headers = this.getHttpOptions();
    //headers.headers.append('Content-Type','multipart/form-data');
    return this.http.post(url, formData);
  }

  _post(url, params= '', body, _timeoutInSec= 60,header_options={}){
    url = api(url, params, true, '');
    var header=this.getHttpOptions();
    for(let key of Object.keys(header_options)){
      header.headers.append(key,header_options[key]);
    }
    return this.http.post(url, body, header).pipe(timeout(_timeoutInSec * 1000));
  }

  _delete(url, params= '') {
    url = api(url, params, true, '');
    return this.http.delete(url, this.getHttpOptions()).pipe();
  }

  _put(url, params= '', body, _timeoutInSec= 60){
    url = api(url, params, true, '');
    return this.http.put(url, body, this.getHttpOptions()).pipe(timeout(_timeoutInSec * 1000));
  }

  logout(){
    $$('Déconnexion de l\'utilisateur');
    this.token = null;
    this.token_expires = null;
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  }


  getyaml(name: string){
    return this._get('getyaml/'+name+"/", "");
  }

  updateData(token) {
    this.token = token;
    // decode the token to read the username and expiration timestamp
    const token_parts = this.token.split(/\./);
    const token_decoded = JSON.parse(window.atob(token_parts[1]));
    this.token_expires = new Date(token_decoded.exp * 1000);
    // this.username = token_decoded.username;
  }


  getfaqs() {
    return this.http.get(api('getyaml/faqs', ''));
  }

  balance(address_to: string) {
    $$("Récupération du solde de "+address_to+" sur le contrat l'ensemble des contrats");
    return this._get("/balance/"+address_to+"/","");
  }


  set_identifier(identifier: string) {
    if(identifier && identifier.length>0){
      $$("Changement de contract : "+identifier);
      localStorage.setItem("identifier",identifier);
      this.identifier=identifier;
      return true;
    } else {
      $$("Aucune monnaie sélectionné");
      return false;
    }
  }

  init_identifier(identifier: string) {
    if(!identifier)identifier=localStorage.getItem("identifier");
    return this.set_identifier(identifier);
  }
}
