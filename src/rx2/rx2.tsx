import { RxProps } from "../rx";
import { isValidElement } from "react";
import { Observable, Subscribable } from "rxjs";
import { isObservable, isPromiseLike, arrayToMap } from "keautils";
import { SubscriptionMap, subscribeMap, SyncValue, SubscribeMapLog, allSync, IgnoreMap, anyError, listErrors } from "./subscription";
import React = require("react");
import { RxState, propsToResetState, extractInitialsFromSubscriptionMap, extractValuesFromRxState, mixRxPropsState, extractValueProps } from "./state";
import { Rxfy } from "../utils";
import { ErrorViewProps, ErrorView } from "../error";



export interface RxProps2<T> {
    /**Componente a dibujar cuando todos los props esten resueltos */
    render: React.ComponentType<T>;

    /**Props que pueden ser promesas u observables */
    props: Rxfy<T>;

    /**Componente a mostrar cuando se esté cargando. Este componente recibirá props indefinidos o inconsistentes entre sí mientras se este cargando.
     * Por default no dibuja nada 
    */
    loading?: React.ComponentType<Partial<T>> | React.ReactElement;

    /**Componente a mostrar cuando algun prop tenga un error */
    error?: React.ComponentType<ErrorViewProps<T>> | React.ReactElement;

    /**Indica que props deben de ser ignorados por el Rx y pasarse tal cual al componente */
    ignore?: IgnoreMap<T>;

    /**True para loggear en la consola */
    debug?: boolean;
}

/**Dibuja el componente en el prop @see render con los props resueltos, cuando estos puedes ser promesas u observables.
 * Mientras no esten resueltos dibuja @see loading
  */
export class Rx<T> extends React.PureComponent<RxProps2<T>, RxState<T>> {
    constructor(props: RxProps2<T>) {
        super(props);
        this.map = subscribeMap(props.props, {}, this.onNext, props.ignore || {}, this.onSubscribeMapLog);
        this.state = {} as any;
    }

    map: SubscriptionMap<T>;

    onSubscribeMapLog = (x: SubscribeMapLog<T>) => {
        if (this.props.debug) {
            console.log(x);
        }
    }

    onNext = <TKey extends keyof T>(key: TKey, value: SyncValue<T[TKey]>) => {
        this.setState({ [key]: value } as any);
    }

    render() {
        const originalProps = this.props.props;
        this.map = subscribeMap<T>(originalProps, this.map, this.onNext, this.props.ignore || {}, this.onSubscribeMapLog);
        const initials = extractInitialsFromSubscriptionMap(this.map);
        const state = extractValuesFromRxState(this.state, originalProps)

        const values = mixRxPropsState(initials, state);
        if (allSync(values)) {
            const props = extractValueProps(values);
            const Comp = this.props.render;

            return <Comp {...props} />;

        } else if (anyError(values)) {
            if (isValidElement(this.props.error)) {
                return this.props.error;
            }

            const errors = listErrors(values);

            const Comp = this.props.error || ErrorView;
            return <Comp errores={errors} />;
        }

        {
            if (isValidElement(this.props.loading)) {
                return this.props.loading;
            }

            /** Es diferente de @see state ya que este puede tener valores inconsistentes (no encaja el state con el prop)*/
            const stateLoading = extractValuesFromRxState(this.state, undefined);
            const values = mixRxPropsState(initials, stateLoading);
            const props = extractValueProps(values);


            const Comp = this.props.loading || (() => null);
            return <Comp {...props} />;
        } 4
    }
}