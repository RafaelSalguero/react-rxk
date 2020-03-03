import { isValidElement } from "react";
import { SubscriptionMap, subscribeMap, SyncValue, SubscribeMapLog, allSync, IgnoreMap, anyError, listErrors, unsubscribeAll } from "./subscription";
import React = require("react");
import { RxState, extractValueProps, RxStateProp, getSyncProps, combineStateProp } from "./state";
import { Rxfy, ComponentType, createJSX } from "../utils";
import { ErrorViewProps, ErrorView } from "../error";


export interface RxProps2<T> {
    /**Componente a dibujar cuando todos los props esten resueltos */
    render: ComponentType<T> | React.ReactNode;
    
    /**Props que pueden ser promesas u observables */
    props: Rxfy<T>;

    /**Componente a mostrar cuando se esté cargando. Este componente recibirá props indefinidos o inconsistentes entre sí mientras se este cargando.
     * Por default dibuja lo mismo que @see render
    */
    loading?: ComponentType<Partial<T>> | React.ReactNode;

    /**Componente a mostrar cuando algun prop tenga un error */
    error?: ComponentType<ErrorViewProps<T>> | React.ReactNode;

    /**Indica que props deben de ser ignorados por el Rx y pasarse tal cual al componente */
    ignore?: IgnoreMap<T>;

    /**True para loggear en la consola */
    debug?: boolean;
}

type RxLog<T> = {
    /**Indica que el RX se va a desmontar y a desuscribir de todos los props */
    type: "unmount"
} | {
    /**Indica un log de las subscripciones */
    type: "sub",
    sub: SubscribeMapLog<T>
} | {
    /**Indica que se construyó la instancia del RX */
    type: "constructor"
};

/**Dibuja el componente en el prop @see render con los props resueltos, cuando estos puedes ser promesas u observables.
 * Mientras no esten resueltos dibuja @see loading
  */
export class Rx<T> extends React.Component<RxProps2<T>, RxState<T>> {
    constructor(props: RxProps2<T>) {
        super(props);
        this.state = {} as any;

        this.onLog({
            type: "constructor"
        });
    }

    map: SubscriptionMap<T> = {};

    componentWillUnmount() {
        this.onLog({
            type: "unmount"
        });
        unsubscribeAll(this.map);
    }

    onLog = (log: RxLog<T>) => {
        if(this.props.debug) {
            console.log(log);
        }
    }

    onSubscribeMapLog = (x: SubscribeMapLog<T>) => {
        this.onLog({
            type: "sub",
            sub: x
        });
    }

    onNext = <TKey extends keyof T>(key: TKey, value: SyncValue<T[TKey]>, version: number) => {
        const nextVal: RxStateProp<T[TKey]> = {
            value: value,
            version: version
        };

        this.setState((state) => {
            //Solo cambiamos el state si esta versión es igual o superior a la actual
            const originalStateProp = state[key];
            if (originalStateProp?.version !== undefined && version < originalStateProp.version) {
                //Este cambio es mas viejo que el state actual
                return null;
            }

            const nextStateProp = combineStateProp(originalStateProp, nextVal);
            const change = { [key]: nextStateProp } as Pick<RxState<T>, TKey>;
            return change;
        });
    }

    render() {
        const originalProps = this.props.props;
        this.map = subscribeMap<T>(originalProps, this.map, this.onNext, this.props.ignore || {}, this.onSubscribeMapLog);
        const values = getSyncProps(this.state, this.map);

        if (allSync(values)) {
            //Todos los valores estan resueltos, dibuja el "render"
            const props = extractValueProps(values);
            const Comp = this.props.render;

            return createJSX(Comp , props );

        } else if (anyError(values)) {
            //Existe algun error
            const errors = listErrors(values);

            const Comp = this.props.error || ErrorView;
            return  createJSX(Comp, {errores: errors});
        }

        {
            //Algun valor está cargando
            const props = extractValueProps(values);

            const Comp = this.props.loading || (this.props.render as ComponentType<Partial<T>>);
            return createJSX(Comp, props);
        }
    }
}

 