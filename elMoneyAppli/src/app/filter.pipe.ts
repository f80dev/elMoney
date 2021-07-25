import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {

   transform(items: any[], args: any[]): any {
    if(!items)return null;
     if(args.length==1){
      if(args[0]=="" || args[0]=="*")return items;
      return items.filter(item => item==args[0]);
    }
    else{
      if(args[1]=="" || args[1]=="*")return items;

      return items.filter(item => !item.hasOwnProperty(args[0]) || (item[args[0]] && item[args[1]] && item[args[0]].toLowerCase().indexOf(args[1].toLowerCase())!==-1));
    }
  }
}
