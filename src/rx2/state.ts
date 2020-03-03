import { SyncValue, SubscriptionMap, SubValue } from "./subscription";
import { RxfyScalar, Rxfy } from "../utils";
import { mapObject, enumObject, filterObject, mergeObj } from "keautils";

/**Un prop del state del Rx */
export interface RxStateProp<T> {
    /**Valor síncrono del prop, ya sea el valor resuelto o el error. (Los valores de "loading" no aparecen en el state) */
    value: SyncValue<T>;
    /**Numero de versión de este valor, se compara con el del mapa de subscripciones para ver cual es la mas reciente */
    version: number;
}

/**Estado interno de un Rx */
export type RxState<T> = {
    [K in keyof T]?: RxStateProp<T[K]>;
}

/**Propiedades resueltas de un Rx, cada propiedad indica si esta resuelta, cargando o error */
export type RxSyncProps<T> = {
    [K in keyof T]?: SyncValue<T[K]>;
}

/**Extrae el props que se le debe de pasar al componente dibujado de un objeto @see RxSyncProps con los valores resuletos
 * Note que extrae los valores 
*/
export function extractValueProps<T>(syncProps: RxSyncProps<T>): T {
    const r = mapObject(syncProps, x =>
        x?.type == "value" ? x.value :
            x?.type == "loading" ? x.fallback :
                undefined as any
    );
    return r;
}

/**Obtiene los props mas recientes combinando los del state y del map*/
export function getSyncProps<T>(state: RxState<T>, map: SubscriptionMap<T>): RxSyncProps<T> {
    const ret = mergeObj(state, map, (stateProp, mapProp): (SyncValue<any> | undefined) => {
        if (mapProp?.initial.type == "value") {
            //El valor esta resuelto en el map:
            return mapProp?.initial;
        }

        if (
            stateProp != null && (
                mapProp?.old == null || (stateProp.version >= mapProp.old.version)
            )
        ) {
            //Esta cargando si el prop tiene una versión mas nueva que el state:
            const isLoading = mapProp === undefined || (stateProp.version < mapProp.version);
            const value = stateProp?.value;

            if (isLoading) {
                return {
                    type: "loading",
                    fallback: value.type == "value" ? value.value : undefined
                };
            }

            //El valor está actualizado y no esta cargando
            return value;
        }

        //El prop es mas reciente, devuelve el valor del prop:
        if (mapProp?.old != null) {
            return {
                type: "loading",
                fallback: mapProp.old.value
            };
        }

        return undefined;
    });

    return ret;
}

/**Combina un cambio de state prop, preservando el valor anterior en el fallback en caso
 * de que un "loading" sustituya a un "value"
*/
export function combineStateProp<T>(old: RxStateProp<T> | undefined, next: RxStateProp<T>) : RxStateProp<T> {
    if(next.value.type =="loading") {
        //Preservar el fallback:
        return {
            ... next,
            value: {
                ... next.value,
                fallback: 
                    old?.value.type =="value" ?  old.value.value : 
                    old?.value.type== "loading" ? old.value.fallback : 
                    undefined
            }
        };
    }
    return next;
}