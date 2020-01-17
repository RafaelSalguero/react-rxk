import { ReactComponent } from "./types";
import * as React from "react";


/**Devuelve si el componente es una clase de react */
function isReactComponentClass<P>(x: ReactComponent<P>): x is React.ComponentClass<P> {
    return ((x as React.ComponentClass<any>) as any).prototype.isReactComponent != null;
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