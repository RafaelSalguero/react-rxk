import { isValidElement } from "react";
import { SubscriptionMap, subscribeMap, SyncValue, SubscribeMapLog, allSync, IgnoreMap, anyError, listErrors, unsubscribeAll } from "./subscription";
import React = require("react");
import { RxState, extractValueProps, RxStateProp, getSyncProps } from "./state";
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
export class Rx<T> extends React.Component<RxProps2<T>, RxState<T>> {
    constructor(props: RxProps2<T>) {
        super(props);
        this.map = subscribeMap(props.props, {}, this.onNext, props.ignore || {}, this.onSubscribeMapLog);
        this.state = {} as any;
    }

    map: SubscriptionMap<T>;

    componentWillUnmount() {
        unsubscribeAll(this.map);
    }

    onSubscribeMapLog = (x: SubscribeMapLog<T>) => {
        if (this.props.debug) {
            console.log(x);
        }
    }

    onNext = <TKey extends keyof T>(key: TKey, value: SyncValue<T[TKey]>, version: number) => {
        const nextVal: RxStateProp<T[TKey]> = {
            value: value,
            version: version
        };

        const change = { [key]: nextVal } as any;
        this.setState((state) => {
            //Solo cambiamos el state si esta versión es superior a la actual
            const originalStateProp = state[key];
            if(originalStateProp?.version !== undefined && version <= originalStateProp.version){
                //Este cambio es mas viejo que el state actual
                return null;
            }

            return change;
        });
    }

    render() {
        const originalProps = this.props.props;
        this.map = subscribeMap<T>(originalProps, this.map, this.onNext, this.props.ignore || {}, this.onSubscribeMapLog);
        const values = getSyncProps(this.state, this.map);

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

            const props = extractValueProps(values);

            const Comp = this.props.loading || (() => null);
            return <Comp {...props} />;
        } 4
    }
}