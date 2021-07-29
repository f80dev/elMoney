import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {showMessage} from "../tools";
import {FileChangeEvent} from "@angular/compiler-cli/src/perform_watch";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.sass']
})
export class UploadFileComponent implements OnInit {

  message:string="";
  filename:string="";
  @Input("filter") filter:any={};
  @Input("send_file") send_file:boolean=false;
  @Input("label") label:string="Sélectionner un fichier";
  @Input("maxsize") maxsize:number=10000000000000;
  @Input("show_cancel") show_cancel:boolean=false;
  @Output("uploaded") onupload:EventEmitter<any>=new EventEmitter();
  @Output("canceled") oncancel:EventEmitter<any>=new EventEmitter();
  @Input("extensions") extensions:string="*";


  constructor(
    public toast:MatSnackBar,
  ) { }

  ngOnInit(): void {
  }


  cancel(){
    this.oncancel.emit();
  }

  import(fileInputEvent: any) {
    var reader: any = new FileReader();
    if (fileInputEvent.target.files[0].size < this.maxsize) {
      this.filename = fileInputEvent.target.files[0].name;
      reader.onload = () => {
        let file = JSON.stringify(reader.result);
        this.message = "";
        this.onupload.emit({filename:this.filename,file:file})
      }

      if(this.send_file){
        this.onupload.emit({filename:fileInputEvent.target.files[0].name,file:fileInputEvent.target.files[0]})
      } else {
        this.message = "Chargement du fichier";
        reader.readAsDataURL(fileInputEvent.target.files[0]);
      }

    } else {
      showMessage(this, "La taille limite des fichier est de " + Math.round(this.maxsize / 1024) + " ko");
      this.message = "";
      this.oncancel.emit();
    }
  }
}
