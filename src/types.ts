import * as rx from "rxjs";

export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null));

export type Rxfy<T> = {
    [K in keyof T]: T[K] | rx.Observable<T[K]> | PromiseLike<T[K]>
};


export interface StateValue {
    value: any;
    firstValue: boolean;
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