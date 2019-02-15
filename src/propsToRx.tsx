import * as React from "react";
import * as rx from "rxjs";
import { shallowEquals, createSelector } from "keautils";
import { RxToReact } from "./rxToReact";
import { createSelectorCreator, defaultMemoize } from "reselect";

export type Element = JSX.Element | null | false;

interface Props<T> {
    render: (props: rx.Observable<T>) => rx.Observable<React.ReactNode>;
    /**Si se asigna este valor, se ignorará el render y se van a pasar directamente los props al mismo, esto permite hacer un 'pass-thru' evitando toda la lógica del Rx */
    syncRender?: React.ReactType<T>;
    props: T;
};

interface State<T> {
    onNextProps: (x: T) => void;
    lastProps: T;
}

const createShallowSelector= createSelectorCreator(defaultMemoize, shallowEquals as any);

/**
 * Dibuja una función render que toma un observable de props y devuelve un observable de elementos.
 * El observable de props se formará a partir de los campos de prop "prop"
 */
export class PropsToRx<T> extends React.PureComponent<Props<T>, State<T>> {
    constructor(props: Props<T>) {
        super(props);
        this.propsObs = new rx.BehaviorSubject(props.props);
        this.state = {
            onNextProps: this.onNextProps,
            lastProps: props.props
        };


    }

    propsObs: rx.BehaviorSubject<T>;

    onNextProps = (x: T) => {
        this.propsObs.next(x);
    }

    renderFunc = (x: Props<T>) => x.render;
    jsxObs = createSelector(this.renderFunc, render => {
        return render(this.propsObs);
    } );

    compRx = createSelector(this.jsxObs, jsxObs => <RxToReact value={jsxObs} />)
    compProps = (x: Props<T>) => x.props;
    syncRx = (x: Props<T>) => x.syncRender;

    compSync = createShallowSelector(this.compProps, this.syncRx, (props, SyncRx) => {
        return (SyncRx != null) ? <SyncRx {...props} /> : undefined;
    });

    //Si el compSync esta definido, entonces hacemos un 'passThru', note que devolvemos el RxToReact con el value asignado en lugar de devolver directamente al compSync
    //Esto es para mantener la estructura del arbol de react y no perder el state del compSync
    comp = createSelector(this.compSync, this.compRx, (compSync, compRx) => {
        return  (compSync != null ) ? <RxToReact value={compSync} /> : compRx;
    });


    static getDerivedStateFromProps(nextProps: Props<any>, prevState: State<any>): State<any> | null {
        if (!shallowEquals(prevState.lastProps, nextProps.props)) {
            prevState.onNextProps(nextProps.props);

            return {
                ...prevState,
                lastProps: nextProps.props
            };
        }

        return null;
    }

    render() {
        return this.comp(this.props);
    }
}
