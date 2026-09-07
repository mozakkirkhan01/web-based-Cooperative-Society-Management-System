import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'enumCase'
})
export class EnumCasePipe implements PipeTransform {

  transform(str: string): string {
    if (str == null)
      return "";
    else
      return str.replace(/([A-Z])/g, ' $1').trim();
  }

}
