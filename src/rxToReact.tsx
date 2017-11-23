import { Observable } from "rxjs/Observable"
import * as React from "react";
import { componentToRx } from "./component2rx";


const Dummy = (props: { comp: JSX.Element | null }) => props.comp || null;
const DummyRx = componentToRx(Dummy);
/**
 * Convert an observable of JSX.Element on to a JSX.Element
 * @param observable A stream of JSX.Elements
 */
export function rxToReact(observable: Observable<JSX.Element | null> | PromiseLike<JSX.Element | null>) {
    return <DummyRx comp={observable} />
}
