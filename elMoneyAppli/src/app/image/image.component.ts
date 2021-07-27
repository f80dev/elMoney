import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {autoRotate, cropToSquare, resizeBase64Img} from "../tools";

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.sass']
})
export class ImageComponent implements OnChanges,OnInit {
  @Input("src") img:string;
  @Input("width") width="auto";
  @Input("height") height="auto";
  @Input("cover") cover=true;
  @Input("maxwidth") maxwidth="150px";
  @Input("maxheight") maxheight="250px";

  @Input('border') border=true;
  @ViewChild('imgObject') imgObject: ElementRef<HTMLImageElement>;
  w:number;
  h:number;

  constructor() { }

  setsize(){
    var img=new Image();
    img.onload=()=>{
      this.w=img.width;
      this.h=img.height;
      if(img.width>img.height){
        this.height="100%";
      } else {
        this.width="100%";
      }
    }
    img.src=this.img;
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.img){
      if(this.img.endsWith('.png') || this.img.indexOf("image/gif")>0)
        this.border=false;

      if(this.cover)this.setsize();
    }
  }

}
