import * as React from "react";
import * as rx from "rxjs";
import { Rxfy } from "./types";
import { PropError, ErrorView, ErrorViewProps } from "./error";
import { renderComponentToRx, ComponentToRxOptions, isJsxElement } from "./componentToRx";
import { createSelector } from "keautils";
 

export interface RxProps<T> {
    render: React.ComponentType<T>;
    props: Rxfy<T>;
    loading?: React.ComponentType<Partial<T>> | JSX.Element,
    error?: React.ComponentType<ErrorViewProps> | JSX.Element;
    options?: ComponentToRxOptions<T>;
    loadingTimeoutMs?: number;
}

const defaultLoadingTimeout = 300;

/**
 * Dibuja un component síncrono pasando props que aceptan promesas y observables.
 */
export class Rx<T> extends React.PureComponent<RxProps<T>> {
    comp = (x: RxProps<T>) => x.render;
    loading = (x: RxProps<T>) => x.loading;
    error = (x: RxProps<T>) => x.error;
    options = (x: RxProps<T>) => x.options;
    loadingTimeoutMs = (x: RxProps<T>) => x.loadingTimeoutMs;

    loadingEff = createSelector(this.loading, this.comp, (Loading, Component): React.ComponentType<Partial<T>> =>
        isJsxElement(Loading) ? (() => Loading) :
            (Loading || Component)
    );

    errorEff = createSelector(this.error, (Error): React.ComponentType<ErrorViewProps> =>
        isJsxElement(Error) ? (() => Error) :
            Error || ErrorView
    );

    obsRender = createSelector(this.comp, this.loadingEff, this.errorEff, this.options, this.loadingTimeoutMs,
        (comp, loading, error, options, loadingTimeoutMs) =>
            (props: rx.Observable<Rxfy<T>>) => renderComponentToRx(
                props,
                comp,
                loading,
                error,
                options,
                loadingTimeoutMs || defaultLoadingTimeout
            )
        );

        
}