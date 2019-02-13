import * as React from "react";
import * as rx from "rxjs";
import { Rxfy } from "./types";
import { PropError, ErrorView, ErrorViewProps } from "./error";
import { renderComponentToRx, ComponentToRxOptions, isJsxElement, allPropsIgnore } from "./componentToRx";
import { createSelector, shallowEquals, enumObject, any, deepEquals, createDeepSelector } from "keautils";
import { PropsToRx } from "./propsToRx";
import { createSelectorCreator, defaultMemoize } from "reselect";


export interface RxProps<T> {
    render: React.ComponentType<T>;
    props: Rxfy<T>;
    loading?: React.ComponentType<Partial<T>> | JSX.Element,
    error?: React.ComponentType<ErrorViewProps> | JSX.Element;
    options?: ComponentToRxOptions<T>;
    loadingTimeoutMs?: number;
}

const defaultLoadingTimeout = 500;

/**Devuelve true si un elemento JSX es igual a otro */
function jsxEquals(a: JSX.Element, b: JSX.Element) {
    return (
        a.key === b.key &&
        a.type === b.type &&
        shallowEquals(a.props, b.props)
    );
}

type JSXOrClass = React.ComponentType<any> | JSX.Element | undefined
function compareCompType(a: JSXOrClass, b: JSXOrClass) {
    if (isJsxElement(a) || isJsxElement(b)) {
        //Uno si y otro no es JSX.element
        if (!isJsxElement(a) || !isJsxElement(b))
            return false;

        return jsxEquals(a, b);
    }
    return a === b;
}

const createSelectorJsx = createSelectorCreator(defaultMemoize as any, compareCompType as any);

/**
 * Dibuja un component síncrono pasando props que aceptan promesas y observables.
 */
export class Rx<T> extends React.Component<RxProps<T>> {
    comp = (x: RxProps<T>) => x.render;
    loadingOrig = (x: RxProps<T>) => x.loading;
    loading = createSelectorJsx(this.loadingOrig, x => x);

    errorOrig = (x: RxProps<T>) => x.error;
    error = createSelectorJsx(this.errorOrig, x => x);

    optionsOrig = (x: RxProps<T>) => x.options;
    options = createDeepSelector(this.optionsOrig, x => x);
    loadingTimeoutMs = (x: RxProps<T>) => x.loadingTimeoutMs;

    loadingEff = createSelector(this.loading, this.comp, (Loading, Component): React.ComponentType<Partial<T>> =>
        isJsxElement(Loading) ? (() => Loading) :
            (Loading || Component)
    );

    errorEff = createSelector(this.error, (Error): React.ComponentType<ErrorViewProps> =>
        isJsxElement(Error) ? (() => Error) :
            Error || ErrorView
    );

    shouldComponentUpdate(nextProps: RxProps<T>) {
        //Compara en forma "shallow" a todos los props excepto al "prop":
        type Comparasiones = Required<{ [k in keyof RxProps<any>]: boolean }>;
        const curr = this.props;
        const comps: Comparasiones = {
            error: !compareCompType(curr.error, nextProps.error),
            loading: !compareCompType(curr.loading, nextProps.loading),
            loadingTimeoutMs: curr.loadingTimeoutMs != nextProps.loadingTimeoutMs,
            options: !deepEquals(curr.options, nextProps.options),
            render: curr.render != nextProps.render,
            props: !shallowEquals(curr.props, nextProps.props)
        }

        const anyDiff = any(enumObject(comps).map(x => x.value), x => x == true);
        return anyDiff;
    }

    obsRender = createSelector(this.comp, this.loadingEff, this.errorEff, this.options, this.loadingTimeoutMs,
        (comp, loading, error, options, loadingTimeoutMs) => {
            return (props: rx.Observable<Rxfy<T>>) => renderComponentToRx(
                props,
                comp,
                loading,
                error,
                options,
                loadingTimeoutMs || defaultLoadingTimeout
            );
        }
    );



    render() {
        const render = this.obsRender(this.props);
        const passThru = allPropsIgnore(this.props.props, this.props.options);
        const syncRender = passThru ? (this.props.render as React.ComponentType<Rxfy<T>>) : undefined;
        return <PropsToRx<Rxfy<T>>
            render={render}
            props={this.props.props}
            syncRender={syncRender}
        />;
    }
}


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
    options?: ComponentToRxOptions<TProps>,
    loadingTimeoutMs: number = 500
): React.ComponentClass<Rxfy<TProps>> {
    return class ComponentToRx extends React.PureComponent<Rxfy<TProps>> {
        render() {
            return <Rx<TProps>
                props={this.props}
                render={Component}
                loading={Loading}
                error={Error}
                options={options}
                loadingTimeoutMs={loadingTimeoutMs}
            />
        }
    };
}

