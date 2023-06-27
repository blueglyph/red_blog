+++
title = "Escaping Macrophages"
[taxonomies]
tags = ["rust", "macros", "language"]
+++

Who doesn't like special privileges? In Rust, the macros grant us this little extra authority over the language, enabling any developer to produce Rust source code from a domain-specific language or to modify the existing code by attaching an attribute.  

Macros are undoubtedly a great and powerful feature, but isn't there a risk that we substitute them for new features that would have otherwise improved the language and its libraries? And aren't they sometimes gnawing away at the clarity of the code?

Let's examine this issue in the context of language evolution, and see if we can make a few suggestions.
<!-- more -->

# Designing a Programming Language Is Hard

Rust has come a long way since the first release, offering many new features and removing a substantial amount of boilerplate code and noise while improving safety; for instance, by clarifying lifetime annotations, empowering macros, fleshing out patterns, and expanding the capabilities of the type system.

But the language is still relatively young, and there is always a desire for more features and less redundancy. Therefore, the Rust teams must remain watchful — and they are — because managing the evolution of a language is a complex undertaking. The two following examples remind us that any misstep may prove hard to recover from.

When Tony Hoare designed ALGOL W with Niklaus Wirth in 1965, he couldn't resist hatching a _null_ reference for the first time in a programming language _'[because it was so easy to implement](https://qconlondon.com/london-2009/qconlondon.com/london-2009/presentation/Null%2BReferences_%2BThe%2BBillion%2BDollar%2BMistake.html)'_. It appeared to be such a simple and elegant solution to represent the absence of referenced objects that it spread to many other languages, including Javascript, C, C++, Java, and PHP. But developers progressively realized that this _null_ concept had also introduced a new insidious class of bugs and vulnerabilities that is very hard to contain. Much later, at the London QCon conference in 2009, Tony Hoare called it his 'billion-dollar mistake'.

And when James Gosling, Patrick Naughton, Chris Warth, Ed Frank, and Mike Sheridan designed the Java language at Sun Microsystem, they didn't consider generics a requirement. That's understandable since generics were still a rare feature at the time. Consequently, the first runtime released in 1995 (1.0 alpha) supported the notion of subclasses and other object-oriented features such as dynamic dispatch, but not type parameters for generics. Nine years later, when generics appeared in version 5.0, this omission became a difficult problem. The designers wanted to preserve backward compatibility with the existing code, but this code wouldn't know what to do with the new type parameter accompanying a generic object. So they had to fall back on _type erasure_ by removing this extra information at runtime. Sadly, this solution towed a few drawbacks, like the inability to distinguish an object's type among the possible subclasses or instantiate an object of the generic type.

In light of those ill-fated examples, it's reassuring that the Rust language team has established [a process](https://lang-team.rust-lang.org/how_to/propose.html) to ensure that many people examine any change proposal before adopting it. The other teams exercise the same caution for the standard library and other aspects of the Rust ecosystem.

But pitfalls may hide in other areas than just the language's specifications.

## Growing a Language

In the recent [announcement of the types team](https://blog.rust-lang.org/2023/01/20/types-announcement.html), Jack Huey, their team leader, described how the increase in requirements matches the pace of the language growth, with an extensive list of open issues that have sometimes been waiting for a long time. As he wrote, _'Many of these tracking issues have been open for so long not solely because of bandwidth, but because working on these features is hard, in large part because putting the relevant semantics in context of the larger language properly is hard; it's not easy for anyone to take a look at them and know what needs to be done to finish them.'_ It's hard to disagree with this statement after looking at the intricacy of the discussions on many of the issues, the interdependencies of those issues, or the size of the source code.

The changes in the organization of the Rust teams, including the one in the announcement above, are examples of the crucial actions they're taking to address this growing complexity.

Besides the language, the [_Standard Library_](https://doc.rust-lang.org/std/) is another vital component that includes core types, operations on primitives, macros, and APIs. It's not just a simple library: it provides types like `Option<T>`, `Result<T, E>`, or `Rc<T>`, which have intimate bonds with the language itself and its philosophy, and set the benchmark for everything else based on it. Caution is required there, too, as Library Team Leader Mara Bos stresses in her _[Rust Library Team Aspirations](https://blog.rust-lang.org/inside-rust/2022/04/20/libs-aspirations.html)_ post. _'Unlike most crates, we cannot release a new major version, as that would effectively be releasing a 'Rust 2.0'. So, once an API is stable, we have to keep it there forever, meaning that we have to be extremely careful when stabilizing anything new.'_ She adds that _'the Rust language has the concept of editions to be able to make breaking changes in the language itself, without disrupting Rust users. The library, however, can make very limited use of editions to correct mistakes.'_

The team members keep the Standard Library minimal for those reasons and to avoid cluttering it with too many modules. The downside is that the developer often needs to find other libraries for everyday functionalities, traditionally available by default in other languages like Python, C# or Java. Thankfully, the library team also maintains [other fundamental crates](https://crates.io/teams/github:rust-lang:libs) and launched an initiative, [_Libz Blitz_](https://blog.rust-lang.org/2017/05/05/libz-blitz.html), to bring many other existing crates to a mature level, so the developer can count on a reliable environment to start developing. A few other projects provide a curated list of crates, like [_stdx_](https://github.com/brson/stdx) (now inactive), [_blessed.rs_](https://blessed.rs/crates) and [_Awesome Rust_](https://awesome-rust.com/), facilitating the choice of libraries. Finally, the post we mentioned earlier describes further plans to improve the Standard Library and expand it.

But despite these outstanding efforts, we can spot little outbursts of chaos here and there.

## Facing Outgrowth

We can unearth the first whiff of chaos by looking at the crates competing to fill gaps in the Standard Library. For example, let's consider the crates providing macros to instantiate a `HashMap` object: [_hashmap_macro_](https://crates.io/crates/hashmap_macro), [_hashmap_](https://crates.io/crates/hashmap) (just a placeholder[^placeholder]), [_map-macro_](https://crates.io/crates/map-macro), [_hmap_](https://crates.io/crates/hmap), [_static_map_macros_](https://crates.io/crates/static_map_macros), [_maplit_](https://crates.io/crates/maplit), [_velcro_](https://crates.io/crates/velcro), and [_cute_](https://crates.io/crates/cute). This wealth of choice may be welcome when each solution fits a particular problem, but not when they're redundant and likely to clutter the downstream dependencies with duplicate functionality — and inflate the binaries. It also adds an unnecessary gradient to the learning curve.

Digging further reveals a worry with those crates: many have yet to reach version 1.0 but show no recent updates. Either they're still in beta, or their owner has left a 0.x version number despite the telltale [orange badge](https://crates.io/crates/cute) — it's hard to tell which. Moreover, all repositories but one have old open issues, and three have open pull requests that have been dead for years.

Another source of confusion is the ability to manipulate the language with macros. We are going to inspect that more closely in the next section.

## Declarative Macros

Declarative macros are simple to write and powerful enough for many needs. Their playground in the code is limited to their argument list — nothing will spill everywhere — and their instances stand out thanks to their exclamation mark, so we don't have to worry about the ambiguities and side effects seen with the C / C++ preprocessor.

However, we shouldn't abuse them, for they weave regular Rust code with macro syntactic elements, which is harder to read and more tedious to write. The IDEs are also more easily confused by declarative macros, which reduces their overall code awareness and refactoring options.

Let's illustrate that with an example and pretend that, as a developer, we'd like to understand how the `shl` method works. In our favourite IDE, we click on the method and execute `Go to Declaration`. Here's where we land, in [core\src\ops\bit.rs](https://github.com/rust-lang/rust/blob/1.70.0/library/core/src/ops/bit.rs#L507):

```rust
shl_impl_all! { u8 u16 u32 u64 u128 usize i8 i16 i32 i64 isize i128 }
```

It shows us that a macro, likely implementing the method, takes a list of types. They must be some of the types supporting the trait of that method. The definition of this macro is not far:

```rust
macro_rules! shl_impl_all {
    ($($t:ty)*) => ($(
        shl_impl! { $t, u8 }
        shl_impl! { $t, u16 }
        shl_impl! { $t, u32 }
        shl_impl! { $t, u64 }
        shl_impl! { $t, u128 }
        shl_impl! { $t, usize }

        shl_impl! { $t, i8 }
        shl_impl! { $t, i16 }
        shl_impl! { $t, i32 }
        shl_impl! { $t, i64 }
        shl_impl! { $t, i128 }
        shl_impl! { $t, isize }
    )*)
}
```

We're on our own to search the `shl_impl` macro now because the IDE has already given up. But as expected, it's just a few lines above:

{{id(id="code_ref")}}
```rust
macro_rules! shl_impl {
    ($t:ty, $f:ty) => {
        #[stable(feature = "rust1", since = "1.0.0")]
        #[rustc_const_unstable(feature = "const_ops", issue = "90080")]
        impl const Shl<$f> for $t {
            type Output = $t;

            #[inline]
            #[rustc_inherit_overflow_checks]
            fn shl(self, other: $f) -> $t {
                self << other
            }
        }

        forward_ref_binop! { impl const Shl, shl for $t, $f }
    };
}
```

While it's not too hard to read, it does require some acclimatization. If we want to create such a macro for our own implementations, we must first transcribe the Rust code to the declarative syntax, and if we need to update it later, we'll have to modify it in place or redo the transcription. Luckily, most IDEs can at least expand macros and even go through them with the debugger.

Let's get back to our research. We see a `forward_ref_binop` macro, but the IDE cannot find it because it's inside another macro where code awareness has vanished. It's not straightforward to find it manually either because no `use` clause points to its definition in the source file, so we have to search in the parent scopes. It's not in `core\src\ops\mod.rs` but one level above, in `core\src\lib.rs`:

```rust
#[macro_use]
mod internal_macros;
```

There, in that module, we find a few gems. [_forward_ref_unop_](https://github.com/rust-lang/rust/blob/1.70.0/library/core/src/internal_macros.rs#L3), [_forward_ref_binop_](https://github.com/rust-lang/rust/blob/1.70.0/library/core/src/internal_macros.rs#L36), and [_forward_ref_op_assign_](https://github.com/rust-lang/rust/blob/1.70.0/library/core/src/internal_macros.rs#L111) implement an existing trait method for referenced types. In other words, the macro instantiated for the type `u8` will implement the method for `&u8` and the combinations of `u8` and `&u8` parameters.

The Standard Library extensively uses those macros, but unfortunately, they have not been made public. What happened next? A few crates sprouted to offer a replacement, like [_forward_ref_](https://crates.io/crates/forward_ref) and [_forward_ref_generic_](https://crates.io/crates/forward_ref_generic).

Are there other hidden treasures, macros, traits, and objects that are general and stable enough to be shared as an API?

Our excursion above illustrates the experience of a developer who meets that construct for the first time or has to build it. To be fair, it gets easier with some practice, but it's not ideal. I could have chosen worse examples: I invite you to try and locate the implementation of the `ilog10` integer method. It's possible but more complex than it should be. Then, if you want to level up, try to see how `Token![,]` is translated in the [_syn_](https://crates.io/crates/syn) crate — a library which is an invaluable gift when creating procedural macros but has to use a few tricks to make it more convenient for its users (let me reassure you: it's not necessary to see how `Token![,]` is defined).

# Remedies

In summary, we contemplate the loss of clarity that sometimes occurs when the code is cast from different moulds — macros and 3rd-party libraries. This divergence, in turn, comes from ordinary features that developers miss. They substitute missed language features with macros that make the code harder to read and maintain, and they substitute missed functionalities with crates that can be redundant and unstable.

How can we improve that?

Before shifting the focus to the main topic of the macro issue, let's quickly look at the general matter of finding crates and making them easier to find.

## Finding the Right Crate

It's sometimes laborious to find the right tools in a Rust ecosystem that is vast and continuously expanding. There are curated lists of crates, but there are several of them — do we need a curated list of lists? And how do we find those lists? Is there a better system? Quite often, developers look on [_crates.io_](https://crates.io/) or use a search engine. I've done that for a long time, without knowing about those lists until, one day, I wondered whether they existed and started looking for them. They must have been announced somewhere, but I overlooked it among many other announcements, news, and discussions.

When we're looking for information, the main gate to Rust knowledge and its ecosystem is [_rust-lang.org_](https://www.rust-lang.org/). There, we find an abundance of carefully organized references, and from _Learn_, we see a link to the Standard Library and its APIs.

One first suggestion is to add other links to the crates maintained by the library team, belonging to a curated list or having benefited from the improvement programme.

From _Tools_, we find a reference to [_crates.io_](https://crates.io/), which we mentioned earlier. It shows us the first entries in 6 pre-defined lists: new crates, most downloaded, just updated, most recently downloaded, popular keywords, and popular categories. Besides simply browsing the catalogue, we can search by name, description, keyword, and category. After trying a few plausible names or keywords, I usually find what I'm looking for, though I'm not always sure to find the best-suited crate. It's easy to overlook crates when some had to find more creative names because of the name shortage, exacerbated by name squatting[^placeholder]. For example, this one provides named and optional arguments but opted for a poorly evocative name: [_duang_](https://crates.io/crates/duang).

Another idea is to improve this _crates.io_ entry point by using the curated lists in one or several ways:
- adding a pre-defined list of curated crates, and allowing to search in a pre-defined list (which isn't currently possible)
- adding a specific category for curated crates
- making curated crates stand out in the search results.

User feedback on the crates could be another improvement; for example, by letting users upvote or downvote a crate. But it raises an obsolescence dilemma when a crate is updated: the update may have solved the issue that generated downvotes. Should the votes be cancelled after some time? Or after an update? Should we cancel only downvotes? And how does the author know _why_ it was upvoted or downvoted? There's no simple way to disentangle this hairball, so it's best to leave it alone and let developers evaluate libraries on their own.

## Opening the Standard Library

How can we stop custom declarative macros from obfuscating our code? And how can we improve the code maintenance?

Granting public access to the `forward_ref` macro family of the Standard Library would be an easy first step in that direction. After all, if they're good enough for all the implementations in an essential library, they must be worth sharing. And to give more weight to the idea, it's worth noting that the macros isolated in `internal_macros.rs` have evolved with the new language features, whereas the 3rd-party substitutes haven't (yet). That's another bonus of using the code written by a team involved in the language's development.

## Default and Blanket Implementations

The developer who needs to implement a trait for several types without rewriting the same code has few alternatives to custom declarative macros. The only ones that come to mind are the default and blanket implementations.

If we use a blanket implementation for the trait above, and if we disregard the reference types for now, we find that it's pretty simple:

```rust
impl<T, U> Shl<U> for T
    where T: std::ops::Shl<U, Output = T>
{
    type Output = T;

    fn shl(self, other: U) -> T {
        self << other
    }
}
```

It's often more complex, however. Expressing the trait bounds and the output type can quickly become a struggle — almost a mini-game — as you can see in the following example (we'll keep the code as bare as possible in the following examples, without compiler attributes and detailed comments).

```rust
use std::ops::{Add, Rem};

/// The addition modulo `m` operation.
trait AddMod {
    type Output;
    fn add_mod(self, other: Self, m: Self) -> Self::Output;
}

impl<T> AddMod for T
    where T: Add, <T as Add>::Output: Rem<T>
{
    type Output = <<Self as Add>::Output as Rem<Self>>::Output;
    
    fn add_mod(self, other: Self, m: Self) -> Self::Output {
        (self + other) % m
    }
}
```

We removed the module path from `Add` and `Rem` to unburden the code, but there's still too much syntactic noise. Even a declarative macro would be easier to read than this. And it's only the start of the troubles: if we needed to use operators like `as`, we would have to add an external dependency like _num-traits_[^num_traits]. Note that using that crate also simplifies the trait bounds when working with numbers. Then it might work; that's sometimes a viable alternative.

A minor drawback of blanket implementations is that all types satisfying the trait bounds are automatically covered and cannot be defined separately. This may be frustrating when a subset could be optimized or must be handled differently. So either we find a longer but more restrictive list of conditions on the type T, to the detriment of clarity, or we cover a more extensive set at the expense of customization.

Alternatively, it's possible to use a default method implementation:

```rust
trait AddMod
    where Self: Add + Sized, <Self as Add>::Output: Rem<Self>
{
    fn add_mod(self, other: Self, m: Self) -> <<Self as Add>::Output as Rem<Self>>::Output {
        (self + other) % m
    }
}
```

However, the syntactic noise is still present. More importantly, the trait bounds have moved to the trait declaration, restricting the implementable types for the wrong reason.

It's still required to write an implementation for those types, which is empty in this case:

```rust
impl<T> AddMod for T where T: Add, <T as Add>::Output: Rem<T> { }
```

The advantage of the default method is the possibility of creating a short implementation list without too much effort. For example, if we're only interested in unsigned values:

```rust
impl AddMod for u8 {}
impl AddMod for u16 {}
impl AddMod for u32 {}
impl AddMod for u64 {}
impl AddMod for u128 {}
```

But we can only have one default method. It's not allowed to define a distinct default method for another type subset, which checks the modulo sign for signed integers, for instance. It's a one-shot advantage with a potentially limiting drawback.

In conclusion, there is no serious challenger to declarative macros for multiple trait implementations. The following section proposes a small language extension to plug the hole.

# A Language Extension

We now leave the themes of 3rd-party crates and hidden treasures of the Standard Library behind us to tackle the 'serial trait implementations' problem and see how we can make it disappear.

What are we looking for? We want to express a trait implementation which shares the same code for several types without the overhead and limitation of trait bounds. If the number of types is relatively small, which is often the case, let's enumerate them!

{{id(id="code1")}}
For the `AddMod` trait defined in the previous section, it would look like this:

```rust,hl_lines=6
trait AddMod {
    type Output;
    fn add_mod(self, other: Self, m: Self) -> Self::Output;
}

impl<T in [i64, u64, f64]> AddMod for T {
    type Output = T;

    fn add_mod(self, other: Self, m: Self) -> Self::Output {
        (self + other) % m
    }
}
```

This code is cleaner than the previous attempts. It contains only the necessary information and looks like a familiar generic trait implementation except for the target types.

The effect would be identical to copying the same implementation code for each type of the list:

```rust
impl AddMod for i64 {
    type Output = i64;
    fn add_mod(self, other: Self, m: Self) -> Self::Output { (self + other) % m }
}
impl AddMod for u64 {
    type Output = u64;
    fn add_mod(self, other: Self, m: Self) -> Self::Output { (self + other) % m }
}
impl AddMod for f64 {
    type Output = f64;
    fn add_mod(self, other: Self, m: Self) -> Self::Output { (self + other) % m }
}
```

It doesn't prevent the implementation of other types nor require us to specify `T` indirectly by the traits it implements.

In the blanket implementation example of the previous section, we couldn't directly tell whether a trait bound was a requirement for the operations or a deliberate limitation of the implemented types. The syntax of what we'll call _type list generics_ clarifies that ambiguity: the implemented types are explicit, and the compiler verifies that they all support the performed operations. If not, the compiler enumerates the incompatible types and shows where the code fails to support them.

## Composition of Generics

If the list is longer or if there are several lists, we can use the `where` form, like in the following example that recreates the `Shl` implementation we discovered earlier. The two parameters have independent types, so we use a _composition_ of two generic types to get all the combinations:

```rust
impl<T, U> Shl<U> for T
    where T in [u8, u16, u32, u64, u128, usize, i8, i16, i32, i64, isize, i128],
          U in [u8, u16, u32, u64, u128, usize, i8, i16, i32, i64, isize, i128]
{
    type Output = T;

    fn shl(self, other: U) -> T {
        self << other
    }
}
```

Let's push the idea further by using dependent generic arguments: below, `U` depends on `T`. Without type list generics, we would need to write separate blanket implementations for `Meter` and `Foot` (unless we can regroup them with another common trait), but here we can avoid code duplication without any compromise:

```rust
struct Meter<T>(T);
struct Foot<T>(T);

impl<T, U> Neg for U
    where T in [f32, f64], U in [Meter<T>, Foot<T>]
{
    type Output = U;

    fn neg(self) -> Self::Output {
        U(-self.0)
    }
}
```

When there are several generic arguments, it's easier to define them in an order that doesn't leave dangling unknowns. Above, we first see `T` that takes known types (`f32` and `f64`), and then we see `U` that relies on `T` — which we already know. It's more natural than defining `U` first and waiting for the definition of `T` to understand what is generated. I suspect it's easier for the compiler, too.  

## Implementing for References

Until now, we swept the trait implementation for the reference types under the rug; it's time we said a few words about it. When a declarative macro implements a trait, it often instantiates a `forward_ref` macro to take care of the reference type, as we have seen [before](#code_ref) when discovering `shl`. All we have to do is give the trait, the method, and the type, and then the macro does the rest.

But if we use the language extension to implement a trait method, we can't instantiate that macro in the generic code. Instead, it has to be separate, so it would be more comfortable if those macros accepted a list of types as shown below:

```rust
trait MyLog {
    fn my_log2(self) -> u32;
}

impl<T in [u8, u16, u32, u64, u128]> MyLog for T {
    fn my_log2(self) -> u32 {
        T::BITS - 1 - self.leading_zeros()
    }
}

forward_ref_unop_list!(impl MyLog, my_log2 for u8, u16, u32, u64, u128);
```

It's not airtight because we have to duplicate the list of types. If we update one list and forget the other, we introduce an asymmetry that may go unnoticed. But this minor problem already exists; we can see in the Standard Library or many other crates that a series of traits often repeat the same list of types. Nothing that a careful search & replace can't handle.
 
We _could_ use a generic composition for those references instead, but the definitions often follow the same pattern, and we developers don't like repeating code. That's why the Standard Library uses the `forward_ref` macros family — that's a good use of declarative macros.

Still, we mentioned it, so it would be cruel not to show an example. We threw in a `Box` reference for the sake of variety and to justify not using a macro[^no_box]:

```rust
impl<T, U> MyLog for U
    where T in [u8, u16, u32, u64, u128], 
          U in [&T, &mut T, Box<T>]
{
    fn my_log2(self) -> u32 {
        MyLog::my_log2(*self)
    }
}
```

## General Application to Type Implementations

There's no reason to limit the suggestion to trait implementations; we could extend it to type implementations:

```rust
impl<T, U> U
    where T in [f32, f64], 
          U in [Meter<T>, Foot<T>]
{
    const PERCENTS_TO_FACTOR: T = 0.01;
    
    fn scale_percent(&self, value: T) -> U {
        U(self.0 * value * Self::PERCENTS_TO_FACTOR)
    }
}
```

The idea is the same: we limit the types to what is necessary, we don't need to specify trait bounds for the operations, and we don't have to make separate implementations for `Meter` and `Foot` any longer. Without the language extension, we would have to write this:

```rust
use std::ops::Mul;

impl<T: Mul<T, Output = T> + Copy> Meter<T> {
    const PERCENTS_TO_FACTOR: T = 0.01;
    
    fn scale(&self, value: T) -> Meter<T> {
        Meter(self.0 * value * Self::PERCENTS_TO_FACTOR)
    }
}

impl<T: Mul<T, Output = T> + Copy> Foot<T> {
    const PERCENTS_TO_FACTOR: T = 0.01;

    fn scale(&self, value: T) -> Foot<T> {
        Foot(self.0 * value * Self::PERCENTS_TO_FACTOR)
    }
}
```

## Testing It with... a Macro

I developed an attribute macro which can be used to test the concept. It's available in the [_trait-gen_](https://crates.io/crates/trait-gen) crate. You can test it, and if you want to see how it works, you can get [its code on GitHub](https://github.com/blueglyph/trait_gen). 

Here's how it looks for the `AddMod` trait in comparison to the [code shown earlier](#code1):

```rust
pub trait AddMod {
    type Output;
    fn add_mod(self, other: Self, m: Self) -> Self::Output;
}

#[trait_gen(T in [i64, u64, f64])]
impl AddMod for T {
    type Output = T;
    
    fn add_mod(self, other: Self, m: Self) -> Self::Output {
        (self + other) % m
    }
}
```

The only difference is the `<T in [i64, u64, f64]>` that moved one line above as `#[trait_gen(T in [i64, u64, f64])]`. 

{% note(title="Note about the syntax") %}
I created this macro before the idea of writing this article. It was initially using a lighter syntax, one that doesn't need an additional level of parenthesis: `#[trait_gen(T -> i64, u64, f64)]`. The syntax above has been added in version 0.3.0 to mimic the suggested language extension.

It's unlikely that I'll maintain this new `in` format when the macro continues to evolve, partly because it's heavier with its three levels of parentheses and, more importantly, because I don't want to introduce any confusion with alternative syntaxes. After all, unnecessary alternatives are what we've just criticized in this article. Think of it as a temporary experiment.

You'll see that the macro documentation uses the arrow `->` format, but both are interchangeable. As the README explains, the `in` form requires enabling the `in_format` dependency feature and generates 'deprecated' warnings (which you can hide with `#[allow(deprecated)]`). These measures purposefully emphasize the format's temporary nature and encourage keeping the original syntax outside the scope of this test.
{% end %}

An attribute macro isn't as good as a pure language extension, but it gives several advantages to test the idea:
- It doesn't require modifying the compiler: an attribute macro is much easier to write, test and compile than the Rust compiler.
- I can share the macro in a crate, which is more convenient than cloning and building from GitHub.
- The attached code remains standard Rust, so it's clear for the reader and the IDEs.

At this point, it's interesting to consider the attribute macro as an alternative to the language extension. Do we need to change the language?

First, we must answer the obvious question: haven't we just argued that macros provide less visibility than native code? Yes, but we were discussing declarative macros mixing their syntax with Rust code. In comparison, attribute macros can be less disruptive when the attached code remains standard Rust code. They manipulate this code as a group of tokens to generate a modified version or to extend it with additional code, but the original code remains perfectly readable. The `#[derive(...)` attributes are well-known examples that generate the `Clone`, `Debug`, or `Display` traits for the following type.

From a clarity point of view, it's the next best thing: we isolate the arguments in the attribute, away from the code they operate on, making the operation plain to the reader.

However, some drawbacks make me prefer the language extension:
- The IDE must expand attribute macros to understand them fully. Right now, it's working well with [_IntelliJ_](https://intellij-rust.github.io/2023/03/13/changelog-190.html) and any editor based on [_rust-analyzer_](https://rust-analyzer.github.io/), but it's still experimental and requires more CPU to analyze than the optimized Rust parser would need for the native code.
- It's an additional dependency.
- It increases the compilation time.
- Someone — now, I — must maintain the code to keep up with the evolution of Rust. The parsing performed by the macro relies on the _syn_ crate, which isn't what the Rust compiler uses, so there's always a risk of discrepancies there, too. For instance, _syn_ has just been upgraded to a new major version to support the latest language features, and it will require significant adaptations in my code to integrate it. This dependency waterfall will never be as good for users as a native language extension.

Let's get back to the macro usage.

We can build generic compositions by chaining several attributes. This example is equivalent to the declarative macro that we first explored and transformed with the language extension. The attribute form isn't far from the latter:

```rust
use trait_gen::trait_gen;

pub trait Shl<Rhs = Self> {
    type Output;
    fn shl(self, rhs: Rhs) -> Self::Output;
}

#[trait_gen(T in [u8, u16, u32, u64, u128, usize, i8, i16, i32, i64, isize, i128])]
#[trait_gen(U in [u8, u16, u32, u64, u128, usize, i8, i16, i32, i64, isize, i128])]
impl Shl<U> for T {
    type Output = T;

    fn shl(self, other: U) -> T {
        self << other
    }
}
```

The generic arguments can be dependent too. To continue the comparison with the language extension, here is how we implement the `Neg` trait for the two generic types:

```rust
struct Meter<T>(T);
struct Foot<T>(T);

#[trait_gen(T in [f32, f64])]
#[trait_gen(U in [Meter<T>, Foot<T>)]
impl Neg for U {
    type Output = U;

    fn neg(self) -> Self::Output {
        U(-self.0)
    }
}
```

Note that there is no generic parameter after `impl` with the attribute macro. The `impl<T,U>` that indicates a generic implementation in the language extension has disappeared here because the macro _is_ the generic implementation.

Finally, I have briefly considered creating a new attribute macro that would transform the language extension into regular Rust, as illustrated below. That syntax would have been ideal for testing the concept. But the IDE would initially be confused by the code and show it as an error, so I didn't pursue that idea.

```rust
trait AddMod {
    type Output;
    fn add_mod(self, other: Self, m: Self) -> Self::Output;
}

#[new_syntax]
impl<T in [i64, u64, f64]> AddMod for T {
    type Output = T;

    fn add_mod(self, other: Self, m: Self) -> Self::Output {
        (self + other) % m
    }
}
```

## Further Thoughts

I'm closing the discussion on the extension by verifying a few points about the syntax: Doesn't the type list generics introduce a problem? Does it fit? And couldn't it do more?

The modification is relatively small and has no side effects that I can see. The resulting code is identical to the trait implementations performed by declarative macros, which comforts that opinion: it's a proven concept.

I tried to make the syntax idiomatic by using the generic form and a straightforward type enumeration:  
* `T in [u8, u16, u32, u64]` looks similar to the `PATTERN in iter_expr` of the [`for` loop](https://doc.rust-lang.org/reference/expressions/loop-expr.html#iterator-loops), suggesting the successive type implementations.
* A possible alternative was the `match` arm pattern `T: u8 | u16 | u32 | u64`, but it suggests _one_ outcome out of all the types, which contradicts the notion of generating _all of them_. I also wanted to avoid the `T:` form already used for trait bounds.
* The types are in an array, which is the simplest iterative expression.

To avoid complications, I didn't try to make it too flexible:
* No type destructuring: `(T, U) in [(i8, u8), (i16, u16)]` implementing the code for `T: i8, U: u8` and `T: i16, U: u16`. For example, we could use it to get an absolute value as an integer of the same bit width.
* No accompanying constants: `(T, C1) in [(i8, 127), (i16, 32767)]` implementing the code for `T: i8, C1 = 127`, etc. It would be handy in some situations, and it isn't unlike the generic constants, but it could also reduce the clarity of the code and raise questions like 'What's the type of C1? Is it always the same type, or can it vary too?'
* No generation of traits: `impl<T in [Trait1, Trait2]> T for MyType` implementing the traits `Trait1` and `Trait2` for the type `MyType`. It could be supported, but the need for shared code between several traits seems remote.
* No generation of blanket implementation for several traits: `impl<T: Display, U in [Trait1, Trait2]> U for T` implementing `Trait1` and `Trait2` for all types that implement `Display`. The need seems too unlikely to fancy this mix of syntaxes.

While some of the previous possibilities are worth considering, I think that it's wiser to start with the base syntax and take the time to see how developers use it before expanding it further.

# Conclusion

Despite the hurdles of bringing up a programming language, we've seen that the Rust team has managed to stand by the core values and take the language to early maturity. The Standard Library complements that foundation by providing, with the help of other selected crates, the essential baggage to handle common scenarios. It also serves as a guide with its exemplary API documentation, idioms such as enums to return optional results or handle errors, and a framework of traits to support many universal operations.


Therefore, it was surprising to find in that library so many instances of one-shot declarative macros doing the same implementation chore and, as if by resentment, showing no goodwill to share the code with us.

It was surprising because we programmers abide by a ground rule. When we must repeat something several times, we consider automatizing it and sharing the code to spare others the same grind. How quickly we consider that depends on what hangs in the balance. On the left side is the amount of work: writing a piece of code that is general enough, testing it thoroughly, documenting it, and finding the right place to share it. On the right side is the time spent redoing the same thing, plus the risk of eventually committing a blunder.

How does that rule apply to declarative macros? If we implement one trait for several types, a declarative macro is an appropriate template technique (brushing aside the loss of clarity of the code). But when we do it for many traits, we reiterate the same task for each macro — type substitution in a piece of code — and make the scales tip the other way. What we discussed in the last section was an automatization of that task.

To be clear, I don't consider declarative macros a shoddy feature, far from it. For example, the Standard Library supplies [a list of handy macros](https://doc.rust-lang.org/std/#macros) that have been written once for many usages. That's the best way to use them.

Now that we've touched on language development and discussed a new feature that could fill a gap, I would like to end with an open question. **Is there an interest in pursuing this idea?** If so, the next step for me is to write and propose an RFC, ensuring the language extension receives all the required scrutiny.

<hr>

_**Footnotes**_:

[^placeholder]: Some people, like [the owner of 'hashmap'](https://crates.io/users/EazyReal), snatch meaningful names without using them &mdash; a technique known as 'name squatting'. In [some cases](https://crates.io/users/swmon), reminiscent of what we see with Internet domain names, the intent seems lucrative. In [other cases](https://crates.io/users/tarcieri), it seems to be an over-zealous appropriation for potential future use. [Namespaces](https://github.com/rust-lang/rfcs/pull/3243) might solve that problem one day, but in the meantime, it makes it harder to come up with good names for legitimate crates and more confusing when searching for them.

[^num_traits]: Sometimes we want to express a set of types as a trait in blanket implementations or trait bounds. A common example is numbers. The library team estimated that it was too problematic to define because of the number of potential operations to consider - what should a 'number' be able to do? The 3rd-party [num](https://crates.io/crates/num) crate and its subpart [num-traits](https://crates.io/crates/num-traits) offer a practical and widely popular interpretation. However, despite being mature, none of those crates has yet reached version 1.0.

[^no_box]: The `forward_ref` macros of the Standard Library and the crates proposing similar macros don't include `Box` nor other smart pointer references.
