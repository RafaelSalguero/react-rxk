import { Observable } from "rxjs/Observable"
import * as React from "react";
import { componentToRx, ComponentToRxPropOptions } from "./component2rx";
import { ReactComponent } from "./types";


const dummy = (props: { comp: JSX.Element | null }) => props.comp || null;
/**
 * Convert an observable of JSX.Element on to a JSX.Element
 * @param observable A stream of JSX.Elements
 */
export function rxToReact(observable: Observable<JSX.Element | null> | PromiseLike<JSX.Element | null> | (JSX.Element | null), fallback?: JSX.Element, error?: ReactComponent<{ error: string }>) {
    const Comp = componentToRx(dummy, fallback, error);
    return <Comp  comp={observable}/>
}
