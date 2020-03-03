import { Observable, isObservable } from "rxjs";
import { isPromiseLike, mergeObj, enumObject, all, any } from "keautils";
import { RxfyScalar, Rxfy } from "../utils";
import { RxSyncProps } from "./state";
import { PropError } from "../error";

interface Subscription<T> {
    /**Valor original */
    original: RxfyScalar<T> | undefined;
    /**Numero de la subscripción, se aumenta con cada prop */
    version: number;
    /**Se desuscribe de este valor */
    unsubscribe: (() => void) | undefined;
    /**Valor inicial, se devuelve si el valor se resolvió en un principo de forma síncrona */
    initial: SyncValue<T>;
    /**El valor anterior */
    old?: SubscriptionOldValue<T>;
}


/**Un valor sincrono resuelto */
export interface SubValue<T> {
    type: "value";
    value: T;
}

/**Un error resultado de una promesa u observable fallido */
export interface SubError {
    type: "error";
    error: any;
}

/**El valor anterior de una subscripción */
export interface SubscriptionOldValue<T> {
    value: T;
    version: number;
}

/**Promesa u observable cargando */
export interface SubLoading<T> {
    type: "loading";
    /**Valor opcional default para un valor que está cargando */
    fallback?: T;
}
/**Representa el estado de una promesax */
export type SyncValue<T> = SubValue<T> | SubError | SubLoading<T>;

/**Tipos de log de un subscribeNew */
export type SubscribeNewLog = {
    /**Indica que hubo un error ya sea en la promesa o en el observable */
    type: "error";
    /**Si el error ocurrió de manera síncrona */
    sync: boolean;
} | {
    /**Llego un valor  */
    type: "onNext",
    /**Si el valor llegó de manera síncrona */
    sync: boolean;
    /**Valor reportado */
    value: any;
} | {
    /**Indica que se subscribiío a un prop, ya sea promesa u observable */
    type: "subscribe",
    value: Observable<any> | PromiseLike<any>
}

/**Se subscribe a un valor
 * @param subscriber suscriptor para los valores asíncronos, nunca se llama de forma síncrona, ni cuando el observable o promesa devuelven inmediatamente
 */
function subscribeNew<T>(
    x: RxfyScalar<T>,
    subscriber: (x: SyncValue<T>) => void,
    log: (x: SubscribeNewLog) => void,
): Subscription<T> {
    let syncValue: SyncValue<T> = { type: "loading" };
    //Si el valor se reportó de inmediato
    let firstValue = true;
    const onNext = (x: T) => {
        log({ type: "onNext", sync: firstValue, value: x });

        if (firstValue) {
            //El primer valor no lo reporta si no que lo establece como el initial
            syncValue = { type: "value", value: x };
        } else {
            subscriber({ type: "value", value: x });
        }
    }

    const onError = (err: any) => {
        log({ type: "error", sync: firstValue });
        if (firstValue) {
            syncValue = { type: "error", error: err };
        } else {
            subscriber({ type: "error", error: err });
        }
    }

    let unsubscribe: (() => void) | undefined = undefined;
    if (isObservable(x)) {
        log({ type: "subscribe", value: x });

        const originalSubscription = x.subscribe(onNext, onError);
        unsubscribe = () => originalSubscription.unsubscribe();
    } else if (isPromiseLike(x)) {
        log({ type: "subscribe", value: x });


        //Imitar el unsubscribe del observable de tal manera que una vez que se llame la resolución de la promesa sea ignorada
        let unsubscribed = false;
        x.then(x => {
            if (unsubscribed)
                return;
            onNext(x);
        }, err => {
            if (unsubscribed)
                return;

            onError(err);
        });

        unsubscribe = () => unsubscribed = true;

    } else {
        onNext(x);
    }

    //Importante establecer firstValue == false para que se marquen los siguientes onNext como asíncronos
    firstValue = false;

    return {
        original: x,
        version: 0,
        initial: syncValue,
        unsubscribe: unsubscribe
    }
}

/**Tipos de log de un subscribe */
export type SubscribeLog =
    SubscribeNewLog | {
        /**Se desuscribe del valor anterior ya que cambió */
        type: "unsubscribe"
    }

/**En caso de que la subscripción vieja tenga un valor resuelto, se lo pone al "old" del "next" en caso de que next este en status de cargando,
 * de tal manera que la subscripción actual a pesar de que este cargando conserve el valor anterior
 */
function setOldToSubscription<T>(old: Subscription<T> | undefined, next: Subscription<T>): Subscription<T> {
    return {
        ...next,
        old: old?.initial.type == "value" ? {
            value: old?.initial.value,
            version: old?.version
        } : old?.old
    }
}

/**Incrementa el numero de versión de una subscripción */
function incrementSubscriptionVersion<T>(old: Subscription<T> | undefined, next: Subscription<T>): Subscription<T> {
    if (!old) return next;
    return {
        ...next,
        version: old.version + 1
    };
}

/**Si cambio el valor, se subscribe y se desuscribe del anterior */
function subscribe<T>(
    next: RxfyScalar<T>,
    old: Subscription<T> | undefined,
    subscriber: (x: SyncValue<T>, version: number) => void,
    log: (x: SubscribeLog) => void): Subscription<T> | undefined {

    if (old !== undefined) {
        if (old.original == next) {
            //El valor no cambió, no hace nada:
            return old;
        }

        //Resubscribir:
        if (old.unsubscribe) {
            log({ type: "unsubscribe" });
            old.unsubscribe();
        }
    }

    const onNext = (value: SyncValue<T>) => {
        //Para este punto ret ya está asignado
        const version = ret.version;
        subscriber(value, version);
    }

    const nextSubsription = subscribeNew(next, onNext, log);
    const ret = incrementSubscriptionVersion(old, setOldToSubscription(old, nextSubsription));
    return ret;
}

/**Devuelve una suscripción "dummy" para un prop que se marcó como que se debe de ignorar */
function passThruSubscription<T>(value: T): Subscription<T> {
    return {
        initial: { type: "value", value: value },
        original: value,
        unsubscribe: undefined,
        version: 0
    };
}

export type SubscriptionMap<T> = { [K in keyof T]?: Subscription<T[K]> }

/**Log de un subscribe map */
export interface SubscribeMapLog<TMap> {
    /**Nombre de la propiedad */
    prop: keyof TMap;
    /**Log de la propiedad */
    log: SubscribeLog;
}

/**Indica que props deben de ser ignorados y pasados tal cual por el Rx */
export type IgnoreMap<T> = {
    [K in keyof T]?: boolean;
}


/**
 * En cada render, obtiene el nuevo mapa de subscripción, se desuscribe de los viejos observables y se suscribe a las nuevas promesas/observables
 * si es que hay
 * @param newProps props del render
 * @param ignoreMap True para los props que se quieran ignorar (pasar el valor tal cual sin realizar ninguna subscripción)
*/
export function subscribeMap<TMap>(
    newProps: Rxfy<TMap>,
    oldMap: SubscriptionMap<TMap>,
    subscriber: (key: keyof TMap, value: SyncValue<TMap[keyof TMap]>, version: number) => void,
    ignoreMap: IgnoreMap<TMap>,
    log: (x: SubscribeMapLog<TMap>) => void
)
    : SubscriptionMap<TMap> {
    const ret = mergeObj(oldMap, newProps, (old, next, key) => {
        /**Si hay qye ignorar este prop y pasarlo tal cual */
        const ignore = ignoreMap[key] === true;
        if (ignore) {
            return passThruSubscription(next);
        }

        return subscribe<TMap[keyof TMap]>(next!, old, (x, version) => subscriber(key, x, version), x => log({ prop: key, log: x }));

    });
    return ret as SubscriptionMap<TMap>;
}

/**Llama al unsubscribe de todas las subscripciones */
export function unsubscribeAll<TMap>(map: SubscriptionMap<TMap>) {
    const items = enumObject(map);
    for (const it of items) {
        it.value?.unsubscribe?.();
    }
}

/**True si todas las propiedades tienen un valor sincrono */
export function allSync<T>(props: RxSyncProps<T>): boolean {
    return all(enumObject(props).map(x => x.value?.type), x => x == "value");
}

/**True si existe algun error en las propiedades */
export function anyError<T>(props: RxSyncProps<T>): boolean {
    return any(enumObject(props).map(x => x.value?.type), x => x == "error");
}

/**Enlista los errores de unos props síncronos */
export function listErrors<T>(props: RxSyncProps<T>): PropError<T>[] {
    return enumObject(props)
        .filter(x => x.value?.type == "error")
        .map<PropError<T>>(x => ({
            prop: x.key,
            error: (x.value as SubError).error
        }));
}