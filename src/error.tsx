import * as React from "react";
export interface PropError<T> {
    prop: keyof T;
    error: string | Error;
}

export interface ErrorViewProps<T = any> {
    errores: PropError<T>[];
}


/**Vista por default para los errores de componentToRx */
export class ErrorView extends React.PureComponent<ErrorViewProps<any>> {
    render() {
        return (
            <span style={{ color: "red" }}>
                {this.props.errores.map(x => x.error.toString())}
            </span>
        );
    }
}