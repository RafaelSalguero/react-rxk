import * as React from "react";
export interface PropError {
    prop: string;
    error: any;
}

export interface ErrorViewProps {
    errores: PropError[];
}


/**Vista por default para los errores de componentToRx */
export class ErrorView extends React.PureComponent<ErrorViewProps> {
    render() {
        return (
            <span style={{ color: "red" }}>
                {
                    this.props.errores.map((x, i) =>
                        <span key={i}>
                            Error al obtener <span style={{fontWeight: "bold"}} >{x.prop}</span>: <span style={{fontStyle: "italic"}}>{"" + x.error}</span>
                        </span>
                    )
                }
            </span>
        );
    }
}