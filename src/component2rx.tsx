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
    if( typeof sym == "function") {
        return (sym as Function).call(y) === y;
    } else {
        return false;
    }
}

/**
 * Convert a react component to a one that accepts rxjs observable on all its props
 * @param component 
 */
export function componentToRx<TProps>(component: (React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null)))): React.ComponentClass<Rxfy<TProps>> {
    const MyComp = component;
    return class ComponentToRx extends React.PureComponent<Rxfy<TProps>, Partial<TProps>> {
        constructor(props) {
            super(props);
            this.state = {} as Readonly<Partial<TProps>>;
            this.processProps({} as any, props);
        }

        private subscriptions: {[K in keyof TProps]?: rx.Subscription | undefined } = {};
        /**
         * Values object will be a fall back for when the observable update occur before the setState can be called
         */
        private values: {[K in keyof TProps]?: TProps[K]} = {};

        private handleNext = <K extends keyof TProps>(key: K, value: any) => {
            const change = { [key]: value } as {[K in keyof TProps]: any};
            this.values[key] = value;
            if(this.mounted) {
                this.setState(change);
            }
        }

        private mounted: boolean = false;
        componentDidMount() {
                this.mounted = true;
        }
        componentWillUnmount() {
            this.mounted= false;
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
                    this.subscriptions[prop] = nextValue.subscribe(next => this.handleNext(prop, next));
                }
            }
        }

        componentWillReceiveProps(next: Rxfy<TProps>) {
            this.processProps(this.props, next);
        }

        render() {
            //Fallback to this.values if current state value is undefined
            const rxValues = mapObject(this.values, (x, key) => (this.state[key] === undefined ?  x: this.state[key]) as any);
            const externalProps = this.props as Rxfy<TProps>;
            const props = mapObject(externalProps, (x, key) => isObservable(x) ? rxValues[key] : (x as any));
            return <MyComp {...props} />
        }
    }
}