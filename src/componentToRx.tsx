import { ErrorViewProps } from "./error";
import { IgnoreMap } from "./rx2/subscription";
import { Rxfy } from "./utils";
import * as React from "react";
import { Rx } from "./rx2";

/**
 * Devuelve un nuevo componente que acepta el valor singular, una promesa, o un observable en cualquiera de sus props, manejando correctamente el estado de cargando y de errores
 * @param Component Componente que se va a dibujar cuando todos los props han sido cargados y no exista ningún error de ningun observables/promesa
 * @param Loading Componente que se va a dibujar cuando existan props que aún estan cargando. Cargando implica que aún no se ha recibido ningún valor. Si es undefined se va a dibujar el componente, note que esto puede implicar que el componente reciva props como undefined cuando estas aún estén cargando
 * @param Error Componente que se va a dibujar cuando exista uno o mas props tales que su observable/promesa ha notificado de un error
 * @param options Opciones para los props
 */
export function componentToRx<TProps>(
    Component: React.ComponentType<TProps>,
    Loading?: React.ComponentType<Partial<TProps>> | JSX.Element,
    Error?: React.ComponentType<ErrorViewProps> | JSX.Element,
    /**Indica que props deben de ser ignorados por el Rx y pasarse tal cual al componente */
    ignore?: IgnoreMap<TProps>
): React.ComponentClass<Rxfy<TProps>> {
    return class ComponentToRx extends React.PureComponent<Rxfy<TProps>> {
        render() {
            return <Rx<TProps>
                props={this.props}
                render={Component}
                loading={Loading}
                error={Error}
                ignore={ignore}
            />
        }
    };
}

