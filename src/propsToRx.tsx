import * as React from "react";
import * as rx from "rxjs";
import { shallowEquals, createSelector } from "keautils";
import { RxToReact } from "./rxToReact";

export type Element = JSX.Element | null | false;

interface Props<T> {
    render: (props: rx.Observable<T>) => rx.Observable<Element>;
    props: T;
};

interface State<T> {
    onNextProps: (x: T) => void;
    lastProps: T;
}

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

    onNextProps = (x: T) =>  {
        this.propsObs.next(x);
    }

    renderFunc = (x: Props<T>)=> x.render;
    jsxObs = createSelector(this.renderFunc, render => render(this.propsObs));
    comp = createSelector(this.jsxObs, jsxObs => <RxToReact value={jsxObs} /> )

    static getDerivedStateFromProps(nextProps: Props<any>, prevState: State<any>): State<any> | null {
        if(!shallowEquals(prevState.lastProps, nextProps.props)) {
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
