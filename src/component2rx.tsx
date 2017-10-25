import { rxToReact } from "./rxToReact";
import * as rx from "rxjs";
import * as React from "react";
import { shallowDiff, mapObject } from "keautils";

export type Rxfy<T> = {
    [K in keyof T]: T[K] | rx.Observable<T[K]>
}

function isObservable<T>(x: T | rx.Observable<T>): x is rx.Observable<T> {
    if (x == null) return false;
    const y = x as rx.Observable<T>;
    const sym = y[rx.Symbol.observable];
    if (typeof sym == "function") {
        return (sym as Function).call(y) === y;
    } else {
        return false;
    }
}

/**
 * Convert a react component to a one that accepts rxjs observable on all its props
 * @param component The component to render when all observables have reported at least one value
 * @param fallback The element to render when there are still pending observables to report the first value. If undefined the component is rendered with undefined values
 */
export function componentToRx<TProps>(component: (React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null))), fallback?: JSX.Element, error?: (props: { error: any }) => JSX.Element): React.ComponentClass<Rxfy<TProps>> {
    const MyComp = component;
    interface State {
        values: Partial<TProps>;
        firstValue: {[K in keyof TProps]?: true};
        error: any;
    }
    return class ComponentToRx extends React.Component<Rxfy<TProps>, State> {
        constructor(props) {
            super(props);
            this.state = {
                error: undefined,
                values: {},
                firstValue: {}
            };
        }

        private subscriptions: {[K in keyof TProps]?: rx.Subscription | undefined } = {};



        /**Devuelve true si el componente esta listo para mostrar, esto es si ya fue recibido el primer valor de todas las subscripciones */
        private get ready() {
            for (const key in this.subscriptions) {
                if (!this.state.firstValue[key])
                    return false;
            }
            return true;
        }

        /**Maneja un siguiente valor del observable */
        private handleNext = <K extends keyof TProps>(key: K, value: any) => {
            this.setState((prev) => ({
                values: { ...(prev.values as {}), [key]: value },
                firstValue: { ...(prev.firstValue as {}), [key]: true },
            }));
        }

        /**Maneja un error del observable */
        private handleError = (error: any) => {
            this.setState((prev) => ({ error: error }));
        }

        /**Maneja un on complete del observable */
        private handleComplete = () => {

        }

        componentWillMount() {
            this.processProps({} as any, this.props);
        }

        componentWillUnmount() {
            //Quitar todas las subscripciones
            for (const key in this.subscriptions) {
                const value = this.subscriptions[key];
                if (value) {
                    value.unsubscribe();
                }
            }
        }

        private processProps(old: Rxfy<TProps>, next: Rxfy<TProps>) {
            const diff = shallowDiff(old, next);
            for (const prop in diff) {
                const oldValue = old[prop];
                const nextValue = next[prop];
                //Remove old subscription
                const oldSubscription = this.subscriptions[prop];
                if (oldSubscription) {
                    oldSubscription.unsubscribe();
                    this.subscriptions[prop] = undefined;
                }

                //Create the new subscription
                if (isObservable(nextValue)) {
                    this.subscriptions[prop] = nextValue.subscribe(next => this.handleNext(prop, next), this.handleError, this.handleComplete);
                }
            }
        }

        componentWillReceiveProps(next: Rxfy<TProps>) {
            this.processProps(this.props, next);
        }

        render() {
            //Fallback to this.values if current state value is undefined
            if (this.state.error) {
                if (error)
                    return error(this.state.error);
                else
                    return <span style={{ color: "red" }} ><b>Error:  {this.state.error}</b></span>
            }
            if (this.ready || fallback === undefined) {
                const rxValues = this.state.values;
                const externalProps = this.props as Rxfy<TProps>;
                const props = mapObject(externalProps, (x, key) => isObservable(x) ? rxValues[key] : (x as any));
                return <MyComp {...props} />
            } else {
                return fallback;
            }

        }
    }
}