import * as React from "react";
import { shallowEquals } from "keautils";

/**Si 2 objetos son elementos de react, devuelve true si son iguales su tipo, key y props, si no son tipos de react, realiza una comparación por referencia*/
export function reactElementEq(a: any, b: any) {
    if (React.isValidElement(a) && React.isValidElement(b)) {
        return reactElementEqInternal(a, b);
    }
    return a === b;
}


function reactElementEqInternal(a: React.ReactElement, b: React.ReactElement): boolean {
    return (
        a.type === b.type &&
        a.key === b.key &&
        shallowEquals(a.props, b.props)
    );
}