import * as rx from "rxjs";
import { LoadingSym } from "keautils";

/**Un componente de react ya sea en forma de clase o función */
export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => React.ReactNode);
export type RxfyScalar<T> = T | rx.Observable<T | typeof LoadingSym> | Promise<T>;
export type Rxfy<T> = {
    [K in keyof T]:  RxfyScalar<T[K]>
};


