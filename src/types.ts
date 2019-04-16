import * as rx from "rxjs";

export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null));
export type RxfyScalar<T> = T | rx.Observable<T | Symbol> | Promise<T>;
export type Rxfy<T> = {
    [K in keyof T]:  RxfyScalar<T[K]>
};


