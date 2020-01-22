import * as rx from "rxjs";
import { LoadingSym } from "keautils";
import * as React from "react";

/**Un componente de react ya sea en forma de clase o función */
export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => React.ReactNode);
export type RxfyScalar<T> = T | rx.Observable<T | typeof LoadingSym> | PromiseLike<T>;
export type Rxfy<T> = {
    [K in keyof T]:  RxfyScalar<T[K]>
};

/**Devuelve si el componente es una clase de react */
function isReactComponentClass<P>(x: ReactComponent<P>): x is React.ComponentClass<P> {
    //Note que prototype puede ser null:
    return ((x as React.ComponentClass<any>) as any).prototype?.isReactComponent != null;
}

/**Devuevle el JSX de un @see ReactComponent */
export function createJSX<T>(Comp: ReactComponent<T>, props: T): React.ReactNode {
    if(isReactComponentClass(Comp)) {
        return <Comp {... props} />;
    } else {
        //Si es una función se llama directamente:
        return Comp(props);
    }
}