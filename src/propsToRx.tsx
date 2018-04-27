import * as React from "react";
import * as rx from "rxjs";
import { shallowEquals } from "keautils";
import { RxToReact } from "./rxToReact";

export type Element = JSX.Element | null | false;

/**Crea un component de react a partir de un función que mapea un observable de los props del componente a un observable de los elementos que se van a dibujar.
 * La función render es llamada cada vez que se llama al constructor del componente devuelto
 * @param render Función que será llamada cada vez que se construye el componente devuelto que toma un observable de los props recibidos y devuelve un observable con los elementos JSX que se quieren dibujar
 */
export function propsToRx<TProps>(render: (props: rx.Observable<TProps>) => rx.Observable<Element>): React.ComponentClass<TProps> {
    interface State {
        onNextProps: (x: TProps) => void;
        lastProps: TProps;
    }

    const ret = class PropsToObs extends React.PureComponent<TProps> {
        constructor(props: TProps) {
            super(props);
            this.propsObs = new rx.BehaviorSubject(props);
            this.state = {
                onNextProps: this.onNextProps,
                lastProps: props
            };

            const jsxObs = render(this.propsObs);
            this.component = <RxToReact value={jsxObs} />;
        }
        propsObs: rx.BehaviorSubject<TProps>;
        component: JSX.Element;

        onNextProps = (x: TProps) =>  {
            this.propsObs.next(x);
        }

        static getDerivedStateFromProps(nextProps: TProps, prevState: State): State {
            if(!shallowEquals(prevState.lastProps, nextProps)) {
                prevState.onNextProps(nextProps);
            }
            return {
                ...prevState,
                lastProps: nextProps
            };
        }
        
        render() {
            return this.component;
        }
    }
    return ret;
}

