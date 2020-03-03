import { SyncValue, SubscriptionMap, SubValue } from "./subscription";
import { RxfyScalar, Rxfy } from "../utils";
import { mapObject, enumObject, filterObject, mergeObj } from "keautils";

/**Un prop del state del Rx */
export interface RxStateProp<T> {
    /**Valor síncrono del prop, ya sea el valor resuelto o el error. (Los valores de "loading" no aparecen en el state) */
    value: SyncValue<T>;
    /**Valor original, se usa para comparar el prop y saber si cambió */
    original: RxfyScalar<T>;
}

/**Estado interno de un Rx */
export type RxState<T> = {
    [K in keyof T]?: RxStateProp<T[K]>;
}
/**Obtiene los nombres de las propiedades que cambiaron y que tienen un estado guardado, estas son 
 * las propiedades que se tienen que resetar en el state
 * @param newProps Props que pueden ser observables o promesas
 * @param oldState Estado anterior de los props
*/
export function propsToResetState<T>(newProps: Rxfy<T>, oldState: RxState<T>): (keyof T)[] {
    const ret = enumObject(newProps)
        .map(x => {
            const oldStateProp = oldState[x.key];
            if (!oldStateProp) {
                /**Si no tiene state anterior para este prop, no hay que resetear (ya esta reseteado) */
                return null;
            }

            const oldValue = oldStateProp.original;
            if (oldValue === x.value) {
                /**Si el valor no cambio, no hay que resetear */
                return null;
            }

            //Para este punto el valor si cambio y si existe en el state, hay que resetear
            return x.key;
        })
        //Quitar los nulos:
        .filter(x => x != null)
        .map(x => x!);
    return ret;
}

/**Propiedades resueltas de un Rx, cada propiedad indica si esta resuelta, cargando o error */
export type RxSyncProps<T> = {
    [K in keyof T]?: SyncValue<T[K]>;
}

/**Extrae las propiedades iniciales de un subscription map */
export function extractInitialsFromSubscriptionMap<T>(map: SubscriptionMap<T>): RxSyncProps<T> {
    const ret = (
        mapObject(
            filterObject(map, x => x !== undefined),
            value => value?.initial as any
        )
    );

    return ret;
}


/**Extrae los valores actuales de un @see RxState
 * @param originalProps Props originales, si se establece, sólo se devuelven los props que encaje el valor original de state contra el del prop, esto indica
 * que el state esta actualiado con respecto al props. Si se establece undefined no se filtra, y devuelve resultados no actualizados (esto es util para dibujar
 * el componente de cargando)
*/
export function extractValuesFromRxState<T>(state: RxState<T>, originalProps: Rxfy<T> | undefined): RxSyncProps<T> {
    const filtered = filterObject(state,
        (x, key) =>
            x != undefined &&
            (originalProps === undefined ? true : originalProps[key] == x?.original));

    const ret =
        mapObject(filtered,
            value => value?.value as any
        );

    return ret;
}

/**Obtiene el objeto de propiedades sincronas al mezclar
 * @param initials Objeto con las propiedades iniciales. Use @see extractInitialsFromSubscriptionMap para obtenerlo del subscription map
 * @param stateValues Valores síncronos que estan almacenados en el state. Use @see extractValuesFromRxState para obtenerlo del state
*/
export function mixRxPropsState<T>(initials: RxSyncProps<T>, stateValues: RxSyncProps<T>): RxSyncProps<T> {
    return mapObject(initials, (value, key) => {
        const initial = value;
        const stateValue = stateValues[key];

        const ret = stateValue || initial;
        return ret as any;
    })
}



/**Extrae el props que se le debe de pasar al componente dibujado de un objeto @see RxSyncProps con los valores resuletos
 * Note que extrae los valores 
*/
export function extractValueProps<T>(syncProps: RxSyncProps<T>): T {
    const r = mapObject(syncProps, x =>
        x?.type == "value" ? x.value :
            x?.type == "loading" ? x.old?.value :
                undefined as any
    );
    return r;
}

/**Obtiene los props que se le deben de pasar al componente de cargando */
export function getLoadingProps<T>(state: RxState<T>, map: SubscriptionMap<T>) : RxSyncProps<T> {
    const ret = mergeObj(state, map, (stateProp, mapProp): (SyncValue<any> | undefined) => {
        if(mapProp?.initial.type== "value") {
            //El valor esta resuelto en el map:
            return mapProp?.initial;
        }

        if(stateProp?.original == mapProp?.original) {
            //Si el state está actualizado, devuelve el valor en el state
            return stateProp?.value;
        }

        //Inconsistencia entre el state y el prop (state se refiere a una instancia diferente del prop)
        
        //Si el prop tiene un valor old, ese es el bueno:
        if(mapProp?.initial.type =="loading" && mapProp?.initial.old != undefined) {
            return mapProp.initial.old;
        }

        //El valor del prop anterior es el bueno:
        return stateProp?.value;
    });

    return ret;
}