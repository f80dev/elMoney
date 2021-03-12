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
  @Input("maxsize") maxsize:number=1000000;
  @Output("uploaded") onupload:EventEmitter<any>=new EventEmitter();
  @Output("canceled") oncancel:EventEmitter<any>=new EventEmitter();


  constructor(
    public toast:MatSnackBar,
  ) { }

  ngOnInit(): void {
  }

  import(fileInputEvent: any) {
    var reader: any = new FileReader();
        this.message = "Chargement du fichier";
        if (fileInputEvent.target.files[0].size < this.maxsize) {
          this.filename = fileInputEvent.target.files[0].name;
          reader.onload = () => {
            let file = JSON.stringify(reader.result);
            this.message = "";
            this.onupload.emit({filename:this.filename,file:file})
          }
          reader.readAsDataURL(fileInputEvent.target.files[0]);
        } else {
          showMessage(this, "La taille limite des fichier est de " + Math.round(this.maxsize / 1024) + " ko");
          this.message = "";
          this.oncancel.emit();
        }
  }
}
