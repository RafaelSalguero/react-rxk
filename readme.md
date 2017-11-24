# react-rx
Higher order component to make any component accept RxJS observables and promises as props

### Create a component
```js
interface MyProps {
    time: number;
}
class MyComp extends React.Component<MyProps> {
    render() {
        return (
            <div>
                <label>Time is: </label>{this.props.time}
            </div>)
    }
}
```

### Use the `componentToRx` function

```js
//MyCompRx accepts Observable values as props
const MyCompRx = componentToRx(MyComp);
```

### Use the RxJS compatible component
```js
export class App extends React.Component {
    private timer = rx.Observable.timer(0, 1000);
   
    render() {
        return (
            <div>
                {/*MyCompRx accept observable props*/}
                <MyCompRx time={this.timer} />
            </div>
        )
    }
}
```

### Or use the `rxToReact` function to render a stream of components

```js
export class App extends React.Component {
    private timer = rx.Observable.timer(0, 1000);
    render() {
        return (
            <div>
                {rxtoReact(timer.map(value => <span>Time is: {value}</span> ))}
            </div>
        )
    }
}
```


### Pass properties as-is with the options
You can also set initial values and mark a property as the loading property

```js 
interface Props {
    name: string;
    /**Promise should be passed as-is to the inner component*/
    prom : Promise<number>;
    /**Observable should be passes as-is to the inner component*/
    obs : Observable<string>;
    /**True to draw a loading icon*/
    loading?: boolean;
}
//MyCompRx accepts Observable values as props
const MyCompRx = componentToRx(MyComp, undefined, undefined, {
    name: { initial: "No name yet" }, //Set initial value when the observable or promise is not resolved yet
    prom: { ignore: { promise : true  } }, //Pass promises as-is 
    obs: {  ignore: { observable: true } }, //Pass observables as-is
    loading: { loading: true } //Mark this property as a loading-property. Is setted to true when the promises or observables are loading for the first time
});

```