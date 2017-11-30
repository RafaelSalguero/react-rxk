import * as rx from "rxjs";

export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null));
export type RxfyScalar<T> = T | rx.Observable<T> | PromiseLike<T>;
export type Rxfy<T> = {
    [K in keyof T]:  RxfyScalar<T[K]>
};


export interface StateValue {
    value: any;
    firstValue: boolean;
    version: number;
}
export type StateValues<TProps> = {[K in keyof TProps]?: StateValue};

export interface State<TProps> {
    /**
     * Valores actuales indicando para cada valor si ya se tiene su valor inicial
     */
    values: StateValues<TProps>;
    /**Errores */
    error: any;
    /**Fecha de carga en ms */
    loadingDate: Date;
    /**Fecha del estado en ms */
    stateDate: Date;
};