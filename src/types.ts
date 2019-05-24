import * as rx from "rxjs";
import { LoadingSym } from "keautils";

export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null));
export type RxfyScalar<T> = T | rx.Observable<T | typeof LoadingSym> | Promise<T>;
export type Rxfy<T> = {
    [K in keyof T]:  RxfyScalar<T[K]>
};


