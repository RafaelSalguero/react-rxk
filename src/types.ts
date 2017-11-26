import * as rx from "rxjs";

export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null));

export type Rxfy<T> = {
    [K in keyof T]: T[K] | rx.Observable<T[K]> | PromiseLike<T[K]>
};

export interface State {
    values: any;
    error: any;
    ready: boolean;
    loadingDate: Date;
    stateDate: Date;
};