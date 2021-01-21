import { Component } from "@angular/core";
import { Http } from "@angular/http";

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Subscription } from "rxjs/Subscription";

import "./operators/rxjs";

export const latest = () => {
  return <T>(source: Observable<T>) => {
    return source.timestamp();
  };
};

@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent {
  private combineLatestSource1$ = new Subject<any>();
  private combineLatestSource2$ = new Subject<any>();
  private combineLatestSource3$ = new Subject<any>();
  private combineLatestSource4$ = new Subject<any>();

  private completed$ = new Subject<any>();

  private buildProgress = { source: new BehaviorSubject<number>(0) };
  private packageProgress = { source: new BehaviorSubject<number>(0) };
  private buildProgressVal = this.buildProgress.source
    .asObservable()
    .distinctUntilChanged();
  private packageProgressVal = this.packageProgress.source
    .asObservable()
    .distinctUntilChanged();

  constructor(private http: Http) {}

  public getObsTimer() {
    let currentProgress = 0;
    return this.http
      .get("https://jsonplaceholder.typicode.com/posts/1")
      .switchMap(_ => {
        return Observable.timer(0, 100)
          .multicast(
            () => new ReplaySubject(1),
            subject =>
              subject
                .takeWhile(_ => currentProgress < 10)
                .concat(subject.take(1))
          )
          .exhaustMap(_ => {
            return this.http
              .get("https://jsonplaceholder.typicode.com/posts/2")
              .switchMap(response => {
                if (currentProgress === 10) {
                  return this.http.get(
                    "https://jsonplaceholder.typicode.com/posts/3"
                  );
                }
                currentProgress++;
                return Observable.of(currentProgress);
              });
          });
      });
  }

  timerPoll() {
    const obs = Observable.forkJoin(this.getObsTimer(), this.getObsTimer());
    const subscribe = obs.subscribe(
      res =>
        console.log(JSON.parse(res[0]["_body"]), JSON.parse(res[1]["_body"])),
      err => console.error(err),
      () => console.log("timer poll done")
    );
  }

  public getObsRepeat(sourceUrl, progress) {
    let currentProgress = 0;
    return this.http
      .get(sourceUrl)
      .map(res => res["title"])
      .switchMap(_ => {
        return this.http
          .get("https://jsonplaceholder.typicode.com/posts/2")
          .map(res => {
            currentProgress++;
            return res["body"];
          })
          .timeout(10000)
          .delay(100)
          .repeat()
          .multicast(
            () => new ReplaySubject(1),
            subject =>
              subject
                .takeWhile(_ => currentProgress < 10.0)
                .concat(subject.take(1))
          )
          .switchMap(_ => {
            if (currentProgress === 10) {
              return this.http.get(
                "https://jsonplaceholder.typicode.com/posts/3"
              );
            }
            return Observable.of(currentProgress);
          });
      });
  }

  public getObs() {
    return this.getObsRepeat(
      "https://jsonplaceholder.typicode.com/posts/1",
      this.buildProgress
    );
  }

  repeatPoll() {
    const obs = Observable.forkJoin(this.getObs(), this.getObs());
    const subscribe = obs.subscribe(
      res =>
        console.log(JSON.parse(res[0]["_body"]), JSON.parse(res[1]["_body"])),
      err => console.error(err),
      () => console.log("repeat poll done")
    );
  }

  startStream() {
    Observable.timer(0, 250)
      .takeUntil(this.completed$)
      .switchMap(v => {
        return Observable.of(`One: ${v}`);
      })
      .subscribe(
        res => console.log(res),
        err => console.error(err),
        () => console.log("done one")
      );

    Observable.timer(0, 500)
      .takeUntil(this.completed$)
      .switchMap(v => {
        return Observable.of(`Two: ${v}`);
      })
      .subscribe(
        res => console.log(res),
        err => console.error(err),
        () => console.log("done two")
      );

    Observable.timer(0, 1000)
      .takeUntil(this.completed$)
      .switchMap(v => {
        return Observable.of(`Three: ${v}`);
      })
      .subscribe(
        res => console.log(res),
        err => console.error(err),
        () => console.log("done three")
      );
  }

  stopUsingTakeUntil() {
    this.completed$.next();
    this.completed$.complete();
  }

  ngOnInit() {
    /*
    Observable.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .concatMap(v => Observable.of(v).delay(1000))
      .takeWhile(v => v < 5)
      .switchMap(v => {
        console.log(v);
        return Observable.of(`Value: ${v}`)
      })
      .subscribe(
        res => console.log(res),
        err => console.error(err),
        () => console.log('done')
      );
    */

    Observable.combineLatest(
      this.combineLatestSource1$
        .asObservable()
        .timestamp()
        .startWith(null),
      this.combineLatestSource2$
        .asObservable()
        .timestamp()
        .startWith(null),
      this.combineLatestSource3$
        .asObservable()
        .timestamp()
        .startWith(null),
      this.combineLatestSource4$
        .asObservable()
        .timestamp()
        .startWith(null)
    )
      .filter(data => data.some(item => !!item))
      .map(data => data.filter(item => !!item))
      .switchMap(data =>
        Observable.of(
          data.reduce((acc, curr) =>
            acc.timestamp > curr.timestamp ? acc : curr
          )
        )
      )
      .map(data => data.value)
      .subscribe(value => console.log(value));
  }
}
