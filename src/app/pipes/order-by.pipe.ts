import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy' })
export class OrderByPipe implements PipeTransform {
    transform(values: any[], objectKeyWithPath: string = '', desc: boolean = true): any {
        const predicatePathValues: string[] = objectKeyWithPath.split('.');
        if (!objectKeyWithPath) {
            return desc ? values.sort().reverse() : values.sort();
        }
        return values.sort((a, b) => {
            let result:any = 0;
            let leftSideValue: any = a;
            let rightSideValue: any = b;

            predicatePathValues.forEach((predicate) => {
                leftSideValue = leftSideValue[predicate];
                rightSideValue = rightSideValue[predicate];
            });

            if (leftSideValue < rightSideValue) {
                result = desc ? 1 : -1;
            } else if (rightSideValue < leftSideValue) {
                result = desc ? -1 : 1;
            }
            return result;
        });
    }
}
